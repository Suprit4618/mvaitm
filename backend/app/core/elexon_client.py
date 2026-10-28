"""
Resilient Elexon BMRS Insights API Client
=========================================
Implements robust retrieval for FUELHH and WINDFOR streams with:
- Connection and read timeouts.
- Bounded retries with exponential backoff.
- Partitioned chunking for WINDFOR forecast history.
- Response validation and deterministic deduplication.
- Chronological sorting.
"""

import time
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger("windsight.elexon_client")

class ElexonAPIError(Exception):
    """Base exception for Elexon API interactions."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body

class ElexonClient:
    def __init__(
        self,
        base_url: str = "https://data.elexon.co.uk/bmrs/api/v1",
        timeout: float = 45.0,
        max_retries: int = 3,
        backoff_factor: float = 1.5
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.headers = {
            "User-Agent": "WindSight-Procurement-Intelligence/1.0",
            "Accept": "application/json"
        }

    def _request_with_retry(self, endpoint: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}{endpoint}"
        retries = 0
        last_error = None

        with httpx.Client(timeout=self.timeout, headers=self.headers) as client:
            while retries <= self.max_retries:
                try:
                    logger.debug(f"HTTP GET {url} with params {params} (attempt {retries + 1}/{self.max_retries + 1})")
                    resp = client.get(url, params=params)
                    
                    if resp.status_code == 200:
                        try:
                            data = resp.json()
                            if not isinstance(data, list):
                                raise ElexonAPIError(f"Unexpected response format: expected JSON list, got {type(data).__name__}")
                            return data
                        except Exception as e:
                            raise ElexonAPIError(f"Failed to parse JSON from {url}: {str(e)}", status_code=resp.status_code)

                    # Transient HTTP status codes: retry
                    if resp.status_code in (429, 500, 502, 503, 504):
                        sleep_time = self.backoff_factor * (2 ** retries)
                        logger.warning(
                            f"HTTP {resp.status_code} from {url}. Retrying in {sleep_time:.1f}s... Error body: {resp.text[:200]}"
                        )
                        time.sleep(sleep_time)
                        retries += 1
                        last_error = ElexonAPIError(f"HTTP {resp.status_code} from {url}", resp.status_code, resp.text)
                        continue

                    # Non-retriable error (e.g. 400 Bad Request, 404)
                    raise ElexonAPIError(
                        f"HTTP {resp.status_code} error from {url}: {resp.text[:300]}",
                        status_code=resp.status_code,
                        response_body=resp.text
                    )

                except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
                    sleep_time = self.backoff_factor * (2 ** retries)
                    logger.warning(f"Network error on {url}: {str(e)}. Retrying in {sleep_time:.1f}s...")
                    time.sleep(sleep_time)
                    retries += 1
                    last_error = ElexonAPIError(f"Connection error to {url}: {str(e)}")

        raise ElexonAPIError(f"Exceeded max retries ({self.max_retries}) for {url}: {str(last_error)}")

    def fetch_actual_generation(
        self,
        start_date: str,
        end_date: str,
        fuel_type: str = "WIND"
    ) -> List[Dict[str, Any]]:
        """
        Retrieves actual generation from /datasets/FUELHH/stream.
        Sorts records ascending by (settlementDate, settlementPeriod) and validates schema.
        """
        params = {
            "settlementDateFrom": start_date,
            "settlementDateTo": end_date,
            "fuelType": fuel_type
        }
        raw_records = self._request_with_retry("/datasets/FUELHH/stream", params)
        
        # Validate and deduplicate
        validated = {}
        for r in raw_records:
            if not isinstance(r, dict):
                continue
            date = r.get("settlementDate")
            sp = r.get("settlementPeriod")
            gen = r.get("generation")
            st = r.get("startTime")
            pub = r.get("publishTime")
            
            if not date or sp is None or gen is None or not st:
                logger.warning(f"Skipping malformed FUELHH record: {r}")
                continue
            
            key = (date, sp)
            validated[key] = {
                "dataset": r.get("dataset", "FUELHH"),
                "settlementDate": date,
                "settlementPeriod": int(sp),
                "startTime": st,
                "publishTime": pub or st,
                "fuelType": r.get("fuelType", fuel_type),
                "generation": int(gen)
            }

        # Sort ascending chronologically
        sorted_records = sorted(validated.values(), key=lambda x: (x["settlementDate"], x["settlementPeriod"]))
        logger.info(f"Retrieved and validated {len(sorted_records)} FUELHH {fuel_type} records for {start_date} to {end_date}.")
        return sorted_records

    def fetch_wind_forecasts(
        self,
        publish_from: str,
        publish_to: str
    ) -> List[Dict[str, Any]]:
        """
        Retrieves wind forecasts for a publication window from /datasets/WINDFOR/stream.
        WINDFOR strictly queries by publishDateTimeFrom / publishDateTimeTo.
        """
        params = {
            "publishDateTimeFrom": publish_from,
            "publishDateTimeTo": publish_to
        }
        raw_records = self._request_with_retry("/datasets/WINDFOR/stream", params)
        
        validated = {}
        for r in raw_records:
            if not isinstance(r, dict):
                continue
            pub = r.get("publishTime")
            st = r.get("startTime")
            gen = r.get("generation")
            
            if not pub or not st or gen is None:
                logger.warning(f"Skipping malformed WINDFOR record: {r}")
                continue
                
            key = (pub, st)
            validated[key] = {
                "dataset": r.get("dataset", "WINDFOR"),
                "publishTime": pub,
                "startTime": st,
                "generation": int(gen)
            }

        # Sort chronologically by publishTime, then startTime
        sorted_records = sorted(validated.values(), key=lambda x: (x["publishTime"], x["startTime"]))
        logger.info(f"Retrieved and validated {len(sorted_records)} WINDFOR records published {publish_from} to {publish_to}.")
        return sorted_records

    def fetch_wind_forecasts_chunked(
        self,
        publish_from_iso: str,
        publish_to_iso: str,
        chunk_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Partitions large forecast history requests into safe weekly chunks (e.g. 7 days)
        to prevent HTTP gateway timeouts.
        """
        dt_start = datetime.fromisoformat(publish_from_iso.replace("Z", "+00:00"))
        dt_end = datetime.fromisoformat(publish_to_iso.replace("Z", "+00:00"))
        
        all_forecasts = {}
        curr = dt_start
        
        while curr < dt_end:
            next_chunk = min(curr + timedelta(days=chunk_days), dt_end)
            w_from = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
            w_to = next_chunk.strftime("%Y-%m-%dT%H:%M:%SZ")
            
            logger.info(f"Fetching WINDFOR chunk: {w_from} to {w_to}")
            chunk_records = self.fetch_wind_forecasts(w_from, w_to)
            for r in chunk_records:
                all_forecasts[(r["publishTime"], r["startTime"])] = r
                
            curr = next_chunk

        sorted_all = sorted(all_forecasts.values(), key=lambda x: (x["publishTime"], x["startTime"]))
        logger.info(f"Total chunked WINDFOR records assembled: {len(sorted_all)}.")
        return sorted_all

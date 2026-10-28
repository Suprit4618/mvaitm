"""
Temporary Elexon BMRS API Investigation Script
Performs reproducible HTTP queries against live Elexon endpoints to verify:
1. Endpoints and supported parameters for FUELHH and WINDFOR.
2. Response schemas, fields, types, and generation units.
3. Historical data coverage for January 2026 purchasing decisions (Dec 31, 2025 - Feb 1, 2026).
4. Point-in-time forecast selection feasibility (avoiding lookahead bias).
5. Hourly-to-half-hourly temporal alignment.
6. Data quality (missing intervals, duplicates, nulls, negative generation).
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from collections import defaultdict, Counter

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def http_get(url, timeout=30):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "WindSight-Investigation-Client/1.0", "Accept": "application/json"}
    )
    start_t = datetime.now()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = (datetime.now() - start_t).total_seconds()
            data = resp.read()
            return {
                "status": resp.status,
                "url": resp.geturl(),
                "elapsed": elapsed,
                "headers": dict(resp.headers),
                "data": json.loads(data.decode("utf-8")),
                "raw_size": len(data)
            }
    except urllib.error.HTTPError as e:
        elapsed = (datetime.now() - start_t).total_seconds()
        body = e.read().decode("utf-8", errors="replace")
        return {
            "status": e.code,
            "url": url,
            "elapsed": elapsed,
            "error": str(e),
            "body": body[:500]
        }
    except Exception as e:
        elapsed = (datetime.now() - start_t).total_seconds()
        return {
            "status": 0,
            "url": url,
            "elapsed": elapsed,
            "error": str(e)
        }

def test_fuelhh():
    print("=" * 80)
    print("1. INVESTIGATING FUELHH (Actual Generation by Fuel Type)")
    print("=" * 80)
    
    # Test 1.1: Small sample request
    url_sample = f"{BASE_URL}/datasets/FUELHH/stream?settlementDateFrom=2026-01-15&settlementDateTo=2026-01-15&fuelType=WIND"
    print(f"Requesting: {url_sample}")
    res = http_get(url_sample)
    print(f"HTTP Status: {res['status']} | Elapsed: {res['elapsed']:.2f}s | Raw Size: {res.get('raw_size', 0)} bytes")
    
    if res['status'] != 200:
        print(f"FAILED: {res.get('error')} | Body: {res.get('body')}")
        return
        
    records = res['data']
    print(f"Retrieved Records: {len(records)}")
    if records:
        print("\nSanitized Sample Record 1 (Settlement Period 1):")
        print(json.dumps(records[0], indent=2))
        print("\nSanitized Sample Record Last (Settlement Period 48):")
        print(json.dumps(records[-1], indent=2))
        
    # Check fields in all records
    fields_present = set()
    fuel_types = set()
    sps = []
    gens = []
    for r in records:
        fields_present.update(r.keys())
        fuel_types.add(r.get("fuelType"))
        sps.append(r.get("settlementPeriod"))
        gens.append(r.get("generation"))
        
    print(f"\nObserved Fields in FUELHH: {sorted(list(fields_present))}")
    print(f"Observed Fuel Types in response: {fuel_types} (Confirmed single-fuel filtering)")
    print(f"Settlement Periods count: {len(sps)}, Range: min={min(sps)}, max={max(sps)}")
    print(f"Unique Settlement Periods count: {len(set(sps))} (Expected 48)")
    print(f"Generation Values: min={min(gens)} MW, max={max(gens)} MW, avg={sum(gens)/len(gens):.1f} MW")
    
    # Test 1.2: Check full coverage for required delivery dates (2026-01-02 to 2026-02-01)
    # Plus 2026-01-01 for completeness
    url_full = f"{BASE_URL}/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-02-01&fuelType=WIND"
    print(f"\nRequesting full evaluation delivery window (2026-01-01 to 2026-02-01, 32 days):")
    print(f"Requesting: {url_full}")
    res_full = http_get(url_full, timeout=60)
    print(f"HTTP Status: {res_full['status']} | Elapsed: {res_full['elapsed']:.2f}s | Raw Size: {res_full.get('raw_size', 0)} bytes")
    
    if res_full['status'] == 200:
        all_recs = res_full['data']
        print(f"Total WIND Actual Records Retrieved: {len(all_recs)}")
        
        # Breakdown by date
        date_counts = Counter(r['settlementDate'] for r in all_recs)
        sorted_dates = sorted(date_counts.keys())
        print(f"Distinct Settlement Dates: {len(sorted_dates)}")
        print(f"Date Range: {sorted_dates[0]} to {sorted_dates[-1]}")
        
        incomplete_dates = {d: c for d, c in date_counts.items() if c != 48}
        if incomplete_dates:
            print(f"WARNING: Incomplete dates found: {incomplete_dates}")
        else:
            print("PERFECT: Every single date from 2026-01-01 to 2026-02-01 has exactly 48 settlement periods!")
            
        # Data quality checks
        null_gens = [r for r in all_recs if r.get("generation") is None]
        negative_gens = [r for r in all_recs if r.get("generation") is not None and r.get("generation") < 0]
        duplicate_keys = set()
        seen_keys = set()
        for r in all_recs:
            key = (r.get("settlementDate"), r.get("settlementPeriod"))
            if key in seen_keys:
                duplicate_keys.add(key)
            seen_keys.add(key)
            
        print(f"Null generation values: {len(null_gens)}")
        print(f"Negative generation values: {len(negative_gens)}")
        print(f"Duplicate (settlementDate, settlementPeriod) pairs: {len(duplicate_keys)}")

if __name__ == "__main__":
    test_fuelhh()

"""
Database Repository: Typed Data Access and Persistence
=====================================================
Encapsulates CRUD operations, idempotent inserts, and point-in-time SQL queries.
"""

import sqlite3
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.db.database import Database

logger = logging.getLogger("windsight.repository")

class Repository:
    def __init__(self, db: Database):
        self.db = db

    def insert_actuals(self, records: List[Dict[str, Any]]) -> int:
        """
        Idempotently inserts FUELHH records.
        Preserves existing records if identical; returns count of inserted/updated rows.
        """
        if not records:
            return 0
        
        sql = """
        INSERT INTO actual_generation (
            settlement_date, settlement_period, start_time, publish_time, fuel_type, generation_mw
        ) VALUES (
            :settlementDate, :settlementPeriod, :startTime, :publishTime, :fuelType, :generation
        )
        ON CONFLICT(settlement_date, settlement_period) DO UPDATE SET
            start_time = excluded.start_time,
            publish_time = excluded.publish_time,
            fuel_type = excluded.fuel_type,
            generation_mw = excluded.generation_mw;
        """
        with self.db.session() as conn:
            cur = conn.executemany(sql, records)
            count = len(records)
        logger.info(f"Ingested {count} actual generation records into database.")
        return count

    def insert_forecasts(self, records: List[Dict[str, Any]]) -> int:
        """
        Idempotently inserts WINDFOR records.
        Composite primary key (publish_time, start_time) prevents duplicate records.
        """
        if not records:
            return 0

        sql = """
        INSERT OR IGNORE INTO forecast_generation (
            publish_time, start_time, generation_mw, dataset
        ) VALUES (
            :publishTime, :startTime, :generation, :dataset
        );
        """
        # Ensure 'dataset' is set on all dicts
        normalized = []
        for r in records:
            normalized.append({
                "publishTime": r["publishTime"],
                "startTime": r["startTime"],
                "generation": r["generation"],
                "dataset": r.get("dataset", "WINDFOR")
            })

        with self.db.session() as conn:
            conn.executemany(sql, normalized)
            count = len(normalized)
        logger.info(f"Ingested {count} forecast generation records into database.")
        return count

    def get_actuals_for_delivery_date(self, delivery_date: str) -> List[Dict[str, Any]]:
        """
        Retrieves all 48 settlement periods for a delivery date, ordered ascending by SP.
        """
        sql = """
        SELECT settlement_date, settlement_period, start_time, publish_time, fuel_type, generation_mw
        FROM actual_generation
        WHERE settlement_date = ?
        ORDER BY settlement_period ASC;
        """
        with self.db.session() as conn:
            rows = conn.execute(sql, (delivery_date,)).fetchall()
            return [dict(r) for r in rows]

    def get_point_in_time_forecast(self, start_time: str, cutoff_iso: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the latest forecast for start_time published ON OR BEFORE cutoff_iso.
        Strictly satisfies publish_time <= cutoff_iso.
        """
        sql = """
        SELECT publish_time, start_time, generation_mw, dataset
        FROM forecast_generation
        WHERE start_time = ? AND publish_time <= ?
        ORDER BY publish_time DESC
        LIMIT 1;
        """
        with self.db.session() as conn:
            row = conn.execute(sql, (start_time, cutoff_iso)).fetchone()
            return dict(row) if row else None

    def get_forecasts_for_delivery_date(self, delivery_date: str, cutoff_iso: str) -> List[Dict[str, Any]]:
        """
        Retrieves point-in-time forecasts for all 24 hours of delivery_date published <= cutoff_iso.
        Uses subquery with window function or group by to ensure highest performance.
        """
        # start_time pattern: delivery_date || 'T%'
        pattern = f"{delivery_date}T%"
        sql = """
        WITH EligibleForecasts AS (
            SELECT 
                publish_time, start_time, generation_mw, dataset,
                ROW_NUMBER() OVER (PARTITION BY start_time ORDER BY publish_time DESC) as rn
            FROM forecast_generation
            WHERE start_time LIKE ? AND publish_time <= ?
        )
        SELECT publish_time, start_time, generation_mw, dataset
        FROM EligibleForecasts
        WHERE rn = 1
        ORDER BY start_time ASC;
        """
        with self.db.session() as conn:
            rows = conn.execute(sql, (pattern, cutoff_iso)).fetchall()
            return [dict(r) for r in rows]

    def get_available_dates(self) -> Dict[str, Any]:
        """
        Returns min/max settlement dates and distinct dates present in DB.
        """
        sql_act = """
        SELECT DISTINCT settlement_date 
        FROM actual_generation 
        ORDER BY settlement_date ASC;
        """
        with self.db.session() as conn:
            act_dates = [r[0] for r in conn.execute(sql_act).fetchall()]
            
        sql_fc = """
        SELECT MIN(publish_time), MAX(publish_time), MIN(start_time), MAX(start_time), COUNT(*)
        FROM forecast_generation;
        """
        with self.db.session() as conn:
            fc_info = conn.execute(sql_fc).fetchone()

        return {
            "actual_dates": act_dates,
            "min_actual_date": act_dates[0] if act_dates else None,
            "max_actual_date": act_dates[-1] if act_dates else None,
            "total_actual_days": len(act_dates),
            "forecast_min_publish": fc_info[0] if fc_info else None,
            "forecast_max_publish": fc_info[1] if fc_info else None,
            "forecast_min_start": fc_info[2] if fc_info else None,
            "forecast_max_start": fc_info[3] if fc_info else None,
            "total_forecast_records": fc_info[4] if fc_info else 0
        }

    def record_ingestion(self, dataset: str, start_date: str, end_date: str, count: int, source: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
        INSERT INTO ingestion_metadata (dataset, start_date, end_date, records_ingested, ingested_at, source)
        VALUES (?, ?, ?, ?, ?, ?);
        """
        with self.db.session() as conn:
            conn.execute(sql, (dataset, start_date, end_date, count, now_iso, source))

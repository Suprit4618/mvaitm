"""
Unit Tests for SQLite Storage and Idempotency
============================================
Tests schema integrity, duplicate handling, and transactional persistence.
"""

import sqlite3
import pytest
from backend.app.db.database import Database
from backend.app.db.repository import Repository

def test_schema_creation_and_indexes(test_db):
    with test_db.session() as conn:
        tables = [
            r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table';"
            ).fetchall()
        ]
        assert "actual_generation" in tables
        assert "forecast_generation" in tables
        assert "ingestion_metadata" in tables
        
        # Verify covering index
        indexes = [
            r[1] for r in conn.execute(
                "PRAGMA index_list('forecast_generation');"
            ).fetchall()
        ]
        assert "idx_forecast_lookup" in indexes

def test_idempotent_actuals_insertion(test_db):
    repo = Repository(test_db)
    recs = [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": 1,
            "startTime": "2026-01-15T00:00:00Z",
            "publishTime": "2026-01-15T00:30:00Z",
            "fuelType": "WIND",
            "generation": 14000
        }
    ]
    
    # First insert
    count1 = repo.insert_actuals(recs)
    assert count1 == 1
    
    # Duplicate insert with updated generation
    recs_updated = [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": 1,
            "startTime": "2026-01-15T00:00:00Z",
            "publishTime": "2026-01-15T00:30:00Z",
            "fuelType": "WIND",
            "generation": 14500 # Updated
        }
    ]
    count2 = repo.insert_actuals(recs_updated)
    assert count2 == 1
    
    # Check that row count is still 1 and value is updated
    rows = repo.get_actuals_for_delivery_date("2026-01-15")
    assert len(rows) == 1
    assert rows[0]["generation_mw"] == 14500

def test_idempotent_forecasts_insertion(test_db):
    repo = Repository(test_db)
    recs = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-14T09:30:00Z",
            "startTime": "2026-01-15T12:00:00Z",
            "generation": 11500
        }
    ]
    
    # Insert once
    repo.insert_forecasts(recs)
    # Insert again
    repo.insert_forecasts(recs)
    
    # Verify exactly 1 record exists in table
    with test_db.session() as conn:
        count = conn.execute("SELECT COUNT(*) FROM forecast_generation;").fetchone()[0]
        assert count == 1

def test_metadata_logging(test_db):
    repo = Repository(test_db)
    repo.record_ingestion("FUELHH", "2026-01-01", "2026-01-02", 96, "test_source")
    
    with test_db.session() as conn:
        row = conn.execute("SELECT * FROM ingestion_metadata;").fetchone()
        assert row["dataset"] == "FUELHH"
        assert row["records_ingested"] == 96
        assert row["source"] == "test_source"

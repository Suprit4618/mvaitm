"""
Pytest Fixtures and Test Setup
==============================
Provides in-memory SQLite instances, mock data fixtures, and FastAPI test client.
"""

import os
import pytest
import sqlite3
from typing import Generator
from fastapi.testclient import TestClient

from backend.app.db.database import Database, get_db
from backend.app.db.repository import Repository
from backend.app.core.analysis_service import AnalysisService
from backend.app.main import app

# Sample synthetic actuals (2 days: 2026-01-14 and 2026-01-15)
@pytest.fixture
def sample_actuals_fixture():
    records = []
    # 2026-01-14 (SP 1-48)
    for sp in range(1, 49):
        h = (sp - 1) // 2
        m = "30" if sp % 2 == 0 else "00"
        records.append({
            "dataset": "FUELHH",
            "settlementDate": "2026-01-14",
            "settlementPeriod": sp,
            "startTime": f"2026-01-14T{h:02d}:{m}:00Z",
            "publishTime": f"2026-01-14T{h:02d}:{m}:00Z",
            "fuelType": "WIND",
            "generation": 10000 + (sp * 50)
        })
    # 2026-01-15 (SP 1-48)
    for sp in range(1, 49):
        h = (sp - 1) // 2
        m = "30" if sp % 2 == 0 else "00"
        records.append({
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": sp,
            "startTime": f"2026-01-15T{h:02d}:{m}:00Z",
            "publishTime": f"2026-01-15T{h:02d}:{m}:00Z",
            "fuelType": "WIND",
            "generation": 12000 + (sp * 40)
        })
    return records

@pytest.fixture
def sample_forecasts_fixture():
    records = []
    # Forecasts for 2026-01-15 delivery published at multiple times on 2026-01-14
    pub_times = [
        ("2026-01-14T07:30:00Z", 11000),
        ("2026-01-14T09:30:00Z", 11500),
        ("2026-01-14T11:30:00Z", 11800), # Post 11:00 UTC
        ("2026-01-14T15:30:00Z", 12200), # Post 14:00 UTC
        ("2026-01-15T02:30:00Z", 12500)  # Post delivery day (Lookahead)
    ]
    for pub, base_mw in pub_times:
        for h in range(24):
            records.append({
                "dataset": "WINDFOR",
                "publishTime": pub,
                "startTime": f"2026-01-15T{h:02d}:00:00Z",
                "generation": base_mw + (h * 30)
            })
    return records

@pytest.fixture
def test_db(tmp_path) -> Generator[Database, None, None]:
    """Provides a fresh isolated SQLite database per test."""
    db_file = tmp_path / "test_wind.db"
    db = Database(str(db_file))
    yield db

@pytest.fixture
def seeded_test_db(test_db, sample_actuals_fixture, sample_forecasts_fixture) -> Database:
    """Provides an isolated database pre-loaded with sample fixture records."""
    repo = Repository(test_db)
    repo.insert_actuals(sample_actuals_fixture)
    repo.insert_forecasts(sample_forecasts_fixture)
    return test_db

@pytest.fixture
def test_client(seeded_test_db) -> Generator[TestClient, None, None]:
    """Test client overriding database dependency with the seeded test database."""
    def override_get_db():
        return seeded_test_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

"""
Integration Tests for Analysis Service
======================================
Tests evaluation workflows, temporal views, boundary window separation,
and missing-data resilience.
"""

import pytest
from backend.app.db.database import Database
from backend.app.db.repository import Repository
from backend.app.core.analysis_service import AnalysisService

def test_daily_analysis_hourly_view(seeded_test_db):
    repo = Repository(seeded_test_db)
    service = AnalysisService(repo)
    
    # Evaluate 2026-01-15 delivery (decision 2026-01-14 @ 11:00 UTC)
    result = service.evaluate_delivery_date(
        delivery_date="2026-01-15",
        cutoff_preset="11:00",
        view_mode="hourly"
    )
    
    assert result["delivery_date"] == "2026-01-15"
    assert result["decision_date"] == "2026-01-14"
    assert result["view_mode"] == "hourly"
    assert result["cutoff_time"] == "11:00"
    
    # 24 hourly intervals
    assert len(result["intervals"]) == 24
    assert result["coverage"]["evaluated_intervals"] == 24
    assert result["coverage"]["coverage_pct"] == 100.0
    
    m = result["metrics"]
    assert m["mae_mw"] > 0
    assert m["rmse_mw"] > 0
    assert m["mean_actual_mw"] > 0

def test_daily_analysis_half_hourly_view(seeded_test_db):
    repo = Repository(seeded_test_db)
    service = AnalysisService(repo)
    
    result = service.evaluate_delivery_date(
        delivery_date="2026-01-15",
        cutoff_preset="11:00",
        view_mode="half_hourly"
    )
    
    assert result["view_mode"] == "half_hourly"
    # 48 settlement periods
    assert len(result["intervals"]) == 48
    assert result["coverage"]["evaluated_intervals"] == 48

def test_missing_data_resilience(test_db):
    """
    If database only has partial actuals (e.g. only SP 1-10) and no forecasts,
    service reports missing intervals cleanly without crashing or silently dropping them.
    """
    repo = Repository(test_db)
    # Insert only 10 actuals
    recs = [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-20",
            "settlementPeriod": sp,
            "startTime": f"2026-01-20T00:{sp:02d}:00Z",
            "publishTime": "2026-01-20T00:30:00Z",
            "fuelType": "WIND",
            "generation": 10000
        }
        for sp in range(1, 11)
    ]
    repo.insert_actuals(recs)
    service = AnalysisService(repo)
    
    result = service.evaluate_delivery_date(
        delivery_date="2026-01-20",
        cutoff_preset="11:00",
        view_mode="hourly"
    )
    
    # Still returns all 24 hour intervals
    assert len(result["intervals"]) == 24
    assert result["coverage"]["missing_forecasts"] == 24
    # All are missing forecast -> evaluated count is 0
    assert result["coverage"]["evaluated_intervals"] == 0
    assert result["coverage"]["coverage_pct"] == 0.0

def test_primary_evaluation_window_with_production_db():
    """
    Evaluates the full primary evaluation window (744 hours) using the
    pre-seeded production SQLite database at backend/wind_data.db.
    """
    from backend.app.config import settings
    from backend.app.db.database import Database
    
    db = Database(settings.database_path)
    repo = Repository(db)
    service = AnalysisService(repo)
    
    summary = service.evaluate_primary_window(cutoff_preset="11:00", view_mode="hourly")
    assert summary["evaluation_scope"] == "PRIMARY_EVALUATION_WINDOW"
    assert summary["coverage"]["total_expected_intervals"] == 744
    assert summary["coverage"]["evaluated_intervals"] == 744
    assert summary["coverage"]["missing_forecasts"] == 0
    assert summary["coverage"]["coverage_pct"] == 100.0
    assert len(summary["daily_trends"]) == 31
    assert len(summary["diurnal_profile"]) == 24
    
    # Boundary validation check
    boundary = service.evaluate_boundary_window(cutoff_preset="11:00", view_mode="hourly")
    assert boundary["evaluation_scope"] == "BOUNDARY_VALIDATION_WINDOW"
    assert boundary["delivery_date"] == "2026-01-01"
    assert boundary["decision_date"] == "2025-12-31"
    assert boundary["coverage"]["evaluated_intervals"] == 24

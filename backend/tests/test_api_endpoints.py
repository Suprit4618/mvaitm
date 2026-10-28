"""
API Endpoint Integration Tests
==============================
Tests REST endpoints, query parameters, schemas, and error responses.
"""

import pytest
from fastapi.testclient import TestClient

def test_health_endpoint(test_client):
    resp = test_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "app_name" in data
    assert "database" in data
    assert data["database"]["actual_days_count"] > 0

def test_dates_endpoint(test_client):
    resp = test_client.get("/api/dates")
    assert resp.status_code == 200
    data = resp.json()
    assert "primary_evaluation_window" in data
    assert data["primary_evaluation_window"]["total_decision_dates"] == 31
    assert data["primary_evaluation_window"]["total_delivery_hours"] == 744
    assert len(data["primary_evaluation_window"]["decision_dates"]) == 31
    assert "boundary_validation_window" in data
    assert data["boundary_validation_window"]["decision_date"] == "2025-12-31"
    assert data["boundary_validation_window"]["delivery_date"] == "2026-01-01"
    assert "cutoff_presets" in data

def test_analysis_endpoint_decision_mode(test_client):
    # Query decision date: 2026-01-14 -> delivery date: 2026-01-15
    resp = test_client.get("/api/analysis?date=2026-01-14&date_mode=decision&cutoff_preset=11:00&view_mode=hourly")
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision_date"] == "2026-01-14"
    assert data["delivery_date"] == "2026-01-15"
    assert data["cutoff_time"] == "11:00"
    assert data["view_mode"] == "hourly"
    assert len(data["intervals"]) == 24
    assert "metrics" in data
    assert "coverage" in data

def test_analysis_endpoint_delivery_mode(test_client):
    # Query delivery date directly: 2026-01-15 -> decision date: 2026-01-14
    resp = test_client.get("/api/analysis?date=2026-01-15&date_mode=delivery&cutoff_preset=09:00&view_mode=half_hourly")
    assert resp.status_code == 200
    data = resp.json()
    assert data["delivery_date"] == "2026-01-15"
    assert data["decision_date"] == "2026-01-14"
    assert data["cutoff_time"] == "09:00"
    assert data["view_mode"] == "half_hourly"
    assert len(data["intervals"]) == 48

def test_analysis_custom_cutoff(test_client):
    resp = test_client.get("/api/analysis?date=2026-01-14&date_mode=decision&custom_cutoff_time=10:30")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cutoff_time"] == "10:30"
    assert "10:30:00Z" in data["cutoff_timestamp"]

def test_analysis_invalid_inputs(test_client):
    # Invalid date
    resp1 = test_client.get("/api/analysis?date=invalid-date")
    assert resp1.status_code == 400
    assert "Invalid date format" in resp1.json()["detail"]
    
    # Invalid date_mode
    resp2 = test_client.get("/api/analysis?date=2026-01-15&date_mode=unsupported")
    assert resp2.status_code == 400
    assert "Invalid date_mode" in resp2.json()["detail"]
    
    # Invalid view_mode
    resp3 = test_client.get("/api/analysis?date=2026-01-15&view_mode=weekly")
    assert resp3.status_code == 400
    assert "Invalid view_mode" in resp3.json()["detail"]

def test_monthly_summary_endpoint():
    """Tests the monthly summary endpoint with the production database."""
    from fastapi.testclient import TestClient
    from backend.app.main import app
    
    client = TestClient(app)
    resp = client.get("/api/monthly-summary?cutoff_preset=11:00&view_mode=hourly")
    assert resp.status_code == 200
    data = resp.json()
    assert data["evaluation_scope"] == "PRIMARY_EVALUATION_WINDOW"
    assert data["coverage"]["total_expected_intervals"] == 744
    assert data["coverage"]["evaluated_intervals"] == 744
    assert data["coverage"]["coverage_pct"] == 100.0
    assert len(data["daily_trends"]) == 31
    assert len(data["diurnal_profile"]) == 24
    assert data["summary_metrics"]["mae_mw"] > 0

def test_sync_endpoint_validation(test_client):
    """Tests input validation bounds on the /api/sync endpoint."""
    # Invalid date format
    resp1 = test_client.post("/api/sync", json={"start_date": "not-a-date", "end_date": "2026-01-05"})
    assert resp1.status_code == 422

    # start_date > end_date
    resp2 = test_client.post("/api/sync", json={"start_date": "2026-01-10", "end_date": "2026-01-05"})
    assert resp2.status_code == 422

    # Range > 35 days
    resp3 = test_client.post("/api/sync", json={"start_date": "2025-01-01", "end_date": "2025-03-01"})
    assert resp3.status_code == 422

def test_spa_static_serving(test_client):
    """Tests serving of compiled React frontend and SPA routing fallbacks."""
    # Root page request should return index.html
    resp = test_client.get("/")
    assert resp.status_code == 200
    assert "text/html" in resp.headers.get("content-type", "")

    # Non-existent client-side route should still return index.html for SPA router
    resp_spa = test_client.get("/arbitrary-route?date=2026-01-15")
    assert resp_spa.status_code == 200
    assert "text/html" in resp_spa.headers.get("content-type", "")

    # Unknown API route should NOT return HTML index; should return 404 JSON
    resp_api = test_client.get("/api/unknown-endpoint")
    assert resp_api.status_code == 404
    assert resp_api.headers.get("content-type") == "application/json"

def test_cutoff_comparison_endpoint(test_client):
    """Tests the /api/cutoff-comparison endpoint comparing 09:00, 11:00, 14:00, and 17:00 cutoffs."""
    resp = test_client.get("/api/cutoff-comparison?date=2026-01-14&date_mode=decision&view_mode=hourly")
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision_date"] == "2026-01-14"
    assert data["delivery_date"] == "2026-01-15"
    assert len(data["comparisons"]) == 4
    presets = [c["preset"] for c in data["comparisons"]]
    assert presets == ["09:00", "11:00", "14:00", "17:00"]
    # 11:00 UTC default delta should be 0.0
    p11 = next(c for c in data["comparisons"] if c["preset"] == "11:00")
    assert p11["delta_mae_mw"] == 0.0
    assert p11["mae_mw"] > 0



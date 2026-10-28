"""
Unit Tests for Resilient Elexon API Client
==========================================
Tests HTTP client error handling, parameter construction, retries, and chunking.
"""

import httpx
import pytest
from unittest.mock import patch, MagicMock
from backend.app.core.elexon_client import ElexonClient, ElexonAPIError

def test_client_fetch_actuals_success():
    client = ElexonClient(base_url="https://mock.elexon.test")
    mock_payload = [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": 2,
            "startTime": "2026-01-15T00:30:00Z",
            "publishTime": "2026-01-15T01:00:00Z",
            "fuelType": "WIND",
            "generation": 14200
        },
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-15",
            "settlementPeriod": 1,
            "startTime": "2026-01-15T00:00:00Z",
            "publishTime": "2026-01-15T00:30:00Z",
            "fuelType": "WIND",
            "generation": 14500
        }
    ]
    
    mock_resp = httpx.Response(200, json=mock_payload, request=httpx.Request("GET", "https://mock.elexon.test"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        actuals = client.fetch_actual_generation("2026-01-15", "2026-01-15")
        
        # Verify chronological sorting (SP 1 first, then SP 2)
        assert len(actuals) == 2
        assert actuals[0]["settlementPeriod"] == 1
        assert actuals[1]["settlementPeriod"] == 2
        assert actuals[0]["generation"] == 14500

def test_client_retry_on_429():
    client = ElexonClient(base_url="https://mock.elexon.test", max_retries=2, backoff_factor=0.01)
    
    mock_429 = httpx.Response(429, text="Rate limit exceeded", request=httpx.Request("GET", "https://mock.elexon.test"))
    mock_200 = httpx.Response(200, json=[], request=httpx.Request("GET", "https://mock.elexon.test"))
    
    # Fails once with 429, succeeds on retry
    with patch("httpx.Client.get", side_effect=[mock_429, mock_200]):
        records = client.fetch_actual_generation("2026-01-15", "2026-01-15")
        assert records == []

def test_client_400_bad_request_raises_immediately():
    client = ElexonClient(base_url="https://mock.elexon.test", max_retries=2, backoff_factor=0.01)
    mock_400 = httpx.Response(400, text="Bad Request Parameter", request=httpx.Request("GET", "https://mock.elexon.test"))
    
    with patch("httpx.Client.get", return_value=mock_400):
        with pytest.raises(ElexonAPIError) as exc_info:
            client.fetch_actual_generation("2026-01-15", "2026-01-15")
        assert exc_info.value.status_code == 400
        assert "Bad Request Parameter" in exc_info.value.response_body

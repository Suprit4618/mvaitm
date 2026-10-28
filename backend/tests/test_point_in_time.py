"""
Unit Tests for Point-in-Time Forecast Selection
===============================================
Verifies that forecast selection strictly respects publishTime <= cutoff,
eliminates lookahead bias, and matches delivery intervals accurately.
"""

import pytest
from backend.app.db.repository import Repository

def test_point_in_time_cutoff_filtering(seeded_test_db):
    repo = Repository(seeded_test_db)
    target_start = "2026-01-15T12:00:00Z"
    
    # 1. Decision Cutoff: 09:00 UTC on 2026-01-14
    # Available in fixture: 07:30 (11000 + 360 = 11360 MW)
    fc_0900 = repo.get_point_in_time_forecast(target_start, "2026-01-14T09:00:00Z")
    assert fc_0900 is not None
    assert fc_0900["publish_time"] == "2026-01-14T07:30:00Z"
    assert fc_0900["generation_mw"] == 11360
    
    # 2. Decision Cutoff: 11:00 UTC on 2026-01-14
    # Available: 07:30 and 09:30. 11:30 is post-cutoff.
    # Must select 09:30 UTC (11500 + 360 = 11860 MW)
    fc_1100 = repo.get_point_in_time_forecast(target_start, "2026-01-14T11:00:00Z")
    assert fc_1100 is not None
    assert fc_1100["publish_time"] == "2026-01-14T09:30:00Z"
    assert fc_1100["generation_mw"] == 11860
    assert fc_1100["publish_time"] <= "2026-01-14T11:00:00Z"
    
    # 3. Decision Cutoff: 14:00 UTC on 2026-01-14
    # Must select 11:30 UTC (11800 + 360 = 12160 MW)
    fc_1400 = repo.get_point_in_time_forecast(target_start, "2026-01-14T14:00:00Z")
    assert fc_1400 is not None
    assert fc_1400["publish_time"] == "2026-01-14T11:30:00Z"
    assert fc_1400["generation_mw"] == 12160
    
    # 4. Decision Cutoff: 17:00 UTC on 2026-01-14
    # Must select 15:30 UTC (12200 + 360 = 12560 MW)
    fc_1700 = repo.get_point_in_time_forecast(target_start, "2026-01-14T17:00:00Z")
    assert fc_1700 is not None
    assert fc_1700["publish_time"] == "2026-01-14T15:30:00Z"
    assert fc_1700["generation_mw"] == 12560

def test_exclusion_of_delivery_day_lookahead_forecasts(seeded_test_db):
    """
    Fixture contains a publication at 2026-01-15T02:30:00Z (on the delivery day).
    Even though it forecasts 2026-01-15T12:00:00Z, under any day-ahead cutoff
    on 2026-01-14, it must be excluded.
    """
    repo = Repository(seeded_test_db)
    target_start = "2026-01-15T12:00:00Z"
    
    # Cutoff end of day-ahead: 2026-01-14T23:59:59Z
    fc = repo.get_point_in_time_forecast(target_start, "2026-01-14T23:59:59Z")
    assert fc["publish_time"] == "2026-01-14T15:30:00Z"
    assert fc["publish_time"] != "2026-01-15T02:30:00Z"

def test_delivery_hour_matching(seeded_test_db):
    """
    Ensures that querying for 14:00:00Z returns a forecast whose startTime is
    strictly 14:00:00Z, not an adjacent hour.
    """
    repo = Repository(seeded_test_db)
    fc = repo.get_point_in_time_forecast("2026-01-15T14:00:00Z", "2026-01-14T11:00:00Z")
    assert fc is not None
    assert fc["start_time"] == "2026-01-15T14:00:00Z"

def test_no_eligible_forecast_returns_none(seeded_test_db):
    """
    If cutoff is prior to any publication, returns None gracefully.
    """
    repo = Repository(seeded_test_db)
    # Earliest in fixture is 07:30 UTC. Query at 05:00 UTC.
    fc = repo.get_point_in_time_forecast("2026-01-15T12:00:00Z", "2026-01-14T05:00:00Z")
    assert fc is None

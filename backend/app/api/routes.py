"""
FastAPI Route Handlers
======================
Exposes REST endpoints for health checks, date discovery, daily analysis,
monthly summaries, and on-demand Elexon synchronization.
"""

import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from backend.app.config import settings
from backend.app.db.database import get_db, Database
from backend.app.db.repository import Repository
from backend.app.core.analysis_service import AnalysisService, PRESET_CUTOFFS
from backend.app.core.elexon_client import ElexonClient, ElexonAPIError
from backend.app.api.schemas import (
    HealthResponse,
    AvailableDatesResponse,
    DailyAnalysisResponse,
    MonthlySummaryResponse,
    CutoffComparisonResponse,
    SyncRequest,
    SyncResponse
)

logger = logging.getLogger("windsight.api")
router = APIRouter(prefix="/api", tags=["Procurement Intelligence"])

def get_analysis_service(db: Database = Depends(get_db)) -> AnalysisService:
    repo = Repository(db)
    return AnalysisService(repo)

@router.get("/health", response_model=HealthResponse)
def health_check(db: Database = Depends(get_db)):
    """Health-check endpoint reporting service liveness and database statistics."""
    repo = Repository(db)
    avail = repo.get_available_dates()
    return {
        "status": "ok",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "database": {
            "path": settings.database_path,
            "actual_days_count": avail["total_actual_days"],
            "forecast_records_count": avail["total_forecast_records"],
            "min_actual_date": avail["min_actual_date"],
            "max_actual_date": avail["max_actual_date"]
        },
        "default_cutoff_preset": settings.default_cutoff_preset
    }

@router.get("/dates", response_model=AvailableDatesResponse)
def get_available_dates(db: Database = Depends(get_db)):
    """
    Returns available historical dates, explicitly distinguishing the Primary Evaluation Window
    (January 2026 purchase decisions) from the Boundary Validation Window.
    """
    repo = Repository(db)
    avail = repo.get_available_dates()
    
    primary_decision_dates = [
        f"2026-01-{d:02d}" for d in range(1, 32)
    ]
    primary_delivery_dates = [
        (datetime(2026, 1, d, tzinfo=timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        for d in range(1, 32)
    ]

    return {
        "min_date": avail["min_actual_date"],
        "max_date": avail["max_actual_date"],
        "total_days": avail["total_actual_days"],
        "primary_evaluation_window": {
            "name": "January 2026 Wholesale Purchase Decisions",
            "decision_dates": primary_decision_dates,
            "delivery_dates": primary_delivery_dates,
            "total_decision_dates": 31,
            "total_delivery_hours": 744,
            "convention": "Day-Ahead (D-1): Delivery Date = Decision Date + 1 Day"
        },
        "boundary_validation_window": {
            "name": "1 January 2026 Delivery Boundary Check",
            "decision_date": "2025-12-31",
            "delivery_date": "2026-01-01",
            "total_hours": 24,
            "note": "Kept independent from primary January metrics."
        },
        "cutoff_presets": PRESET_CUTOFFS
    }

@router.get("/analysis", response_model=DailyAnalysisResponse)
def get_daily_analysis(
    date: str = Query("2026-01-15", description="Evaluation date (YYYY-MM-DD)"),
    date_mode: str = Query("decision", description="Perspective: 'decision' (default) or 'delivery'"),
    cutoff_preset: str = Query("11:00", description="Cutoff preset: '09:00', '11:00', '14:00', '17:00'"),
    custom_cutoff_time: Optional[str] = Query(None, description="Optional custom cutoff time HH:MM (UTC)"),
    view_mode: str = Query("hourly", description="Temporal resolution: 'hourly' (default) or 'half_hourly'"),
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    Evaluates wind generation forecast accuracy for a target day.
    
    If date_mode == 'decision': The power was procured on this date for delivery on date + 1 day.
    If date_mode == 'delivery': Direct evaluation for the specified delivery date (decided date - 1 day).
    """
    try:
        dt = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if date_mode.lower() == "decision":
        if not (datetime(2025, 12, 31, tzinfo=timezone.utc) <= dt <= datetime(2026, 1, 31, tzinfo=timezone.utc)):
            raise HTTPException(
                status_code=400,
                detail=f"Selected decision date {date} is outside the allowed January 2026 evaluation window (2026-01-01 to 2026-01-31, boundary: 2025-12-31)."
            )
        delivery_date = (dt + timedelta(days=1)).strftime("%Y-%m-%d")
    elif date_mode.lower() == "delivery":
        if not (datetime(2026, 1, 1, tzinfo=timezone.utc) <= dt <= datetime(2026, 2, 1, tzinfo=timezone.utc)):
            raise HTTPException(
                status_code=400,
                detail=f"Selected delivery date {date} is outside the allowed January 2026 evaluation window (2026-01-02 to 2026-02-01, boundary: 2026-01-01)."
            )
        delivery_date = date
    else:
        raise HTTPException(status_code=400, detail="Invalid date_mode. Expected 'decision' or 'delivery'.")

    view = view_mode.lower()
    if view not in ("hourly", "half_hourly"):
        raise HTTPException(status_code=400, detail="Invalid view_mode. Expected 'hourly' or 'half_hourly'.")

    try:
        return service.evaluate_delivery_date(
            delivery_date=delivery_date,
            cutoff_preset=cutoff_preset,
            custom_cutoff_time=custom_cutoff_time,
            view_mode=view
        )
    except Exception as e:
        logger.error(f"Error evaluating delivery date {delivery_date}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis calculation error: {str(e)}")

@router.get("/cutoff-comparison", response_model=CutoffComparisonResponse)
def get_cutoff_comparison(
    date: str = Query("2026-01-14", description="Evaluation date (YYYY-MM-DD)"),
    date_mode: str = Query("decision", description="Perspective: 'decision' (default) or 'delivery'"),
    view_mode: str = Query("hourly", description="Temporal resolution: 'hourly' (default) or 'half_hourly'"),
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    Evaluates forecast error sensitivity across standard cutoff presets (09:00, 11:00, 14:00, 17:00 UTC)
    for a target day, directly answering how changing decision timing impacts accuracy.
    """
    try:
        dt = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if date_mode.lower() == "decision":
        if not (datetime(2025, 12, 31, tzinfo=timezone.utc) <= dt <= datetime(2026, 1, 31, tzinfo=timezone.utc)):
            raise HTTPException(
                status_code=400,
                detail=f"Selected decision date {date} is outside the allowed January 2026 evaluation window."
            )
        delivery_date = (dt + timedelta(days=1)).strftime("%Y-%m-%d")
    elif date_mode.lower() == "delivery":
        if not (datetime(2026, 1, 1, tzinfo=timezone.utc) <= dt <= datetime(2026, 2, 1, tzinfo=timezone.utc)):
            raise HTTPException(
                status_code=400,
                detail=f"Selected delivery date {date} is outside the allowed January 2026 evaluation window."
            )
        delivery_date = date
    else:
        raise HTTPException(status_code=400, detail="Invalid date_mode. Expected 'decision' or 'delivery'.")

    view = view_mode.lower()
    if view not in ("hourly", "half_hourly"):
        raise HTTPException(status_code=400, detail="Invalid view_mode. Expected 'hourly' or 'half_hourly'.")

    try:
        return service.evaluate_cutoff_sensitivity(
            delivery_date=delivery_date,
            view_mode=view
        )
    except Exception as e:
        logger.error(f"Error evaluating cutoff sensitivity for {delivery_date}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Cutoff comparison error: {str(e)}")

@router.get("/monthly-summary", response_model=MonthlySummaryResponse)
def get_monthly_summary(
    cutoff_preset: str = Query("11:00", description="Cutoff preset: '09:00', '11:00', '14:00', '17:00'"),
    custom_cutoff_time: Optional[str] = Query(None, description="Optional custom cutoff time HH:MM (UTC)"),
    view_mode: str = Query("hourly", description="Temporal resolution: 'hourly' (default) or 'half_hourly'"),
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    Evaluates the full Primary Evaluation Window across all 31 January 2026 purchase decisions
    (744 delivery hours, January 2 - February 1, 2026).
    """
    view = view_mode.lower()
    if view not in ("hourly", "half_hourly"):
        raise HTTPException(status_code=400, detail="Invalid view_mode. Expected 'hourly' or 'half_hourly'.")

    try:
        return service.evaluate_primary_window(
            cutoff_preset=cutoff_preset,
            custom_cutoff_time=custom_cutoff_time,
            view_mode=view
        )
    except Exception as e:
        logger.error(f"Error evaluating monthly summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Monthly summary calculation error: {str(e)}")

@router.post("/sync", response_model=SyncResponse)
def sync_live_data(
    req: SyncRequest = SyncRequest(),
    db: Database = Depends(get_db)
):
    """
    On-demand synchronization with the official live Elexon BMRS API.
    Fetches FUELHH and WINDFOR streams and merges them idempotently into SQLite.
    """
    t0 = time.time()
    client = ElexonClient(base_url=settings.elexon_base_url)
    repo = Repository(db)
    
    try:
        logger.info(f"Triggering sync for actuals from {req.start_date} to {req.end_date}...")
        actuals = client.fetch_actual_generation(
            start_date=req.start_date,
            end_date=req.end_date,
            fuel_type="WIND"
        )
        act_count = repo.insert_actuals(actuals)
        
        # Determine publish window for forecasts
        pub_from = f"{req.start_date}T00:00:00Z"
        pub_to = f"{req.end_date}T23:59:59Z"
        logger.info(f"Triggering chunked sync for forecasts from {pub_from} to {pub_to}...")
        forecasts = client.fetch_wind_forecasts_chunked(
            publish_from_iso=pub_from,
            publish_to_iso=pub_to,
            chunk_days=8
        )
        fc_count = repo.insert_forecasts(forecasts)
        
        duration = round(time.time() - t0, 2)
        repo.record_ingestion("FUELHH", req.start_date, req.end_date, act_count, "live_sync")
        repo.record_ingestion("WINDFOR", pub_from, pub_to, fc_count, "live_sync")
        
        return {
            "status": "success",
            "actuals_ingested": act_count,
            "forecasts_ingested": fc_count,
            "duration_seconds": duration,
            "message": f"Successfully synchronized {act_count} actuals and {fc_count} forecasts in {duration}s."
        }
    except ElexonAPIError as e:
        logger.error(f"Elexon API error during sync: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Upstream Elexon API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during sync: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Synchronization failed: {str(e)}")

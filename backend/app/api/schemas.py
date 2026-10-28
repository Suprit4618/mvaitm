"""
Pydantic Schemas for API Responses and Requests
===============================================
Defines typed, stable contracts for consumption by FastAPI and the React frontend.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator

class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    version: str
    database: Dict[str, Any]
    default_cutoff_preset: str

class AvailableDatesResponse(BaseModel):
    min_date: Optional[str]
    max_date: Optional[str]
    total_days: int
    primary_evaluation_window: Dict[str, Any]
    boundary_validation_window: Dict[str, Any]
    cutoff_presets: Dict[str, Any]

class ErrorQuantiles(BaseModel):
    min: float
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    max: float

class MetricsSummary(BaseModel):
    mae_mw: float = Field(description="Mean Absolute Error in MW")
    rmse_mw: float = Field(description="Root Mean Squared Error in MW")
    bias_mw: float = Field(description="Mean Signed Error in MW (Forecast - Actual)")
    nmae_pct: float = Field(description="Normalized MAE as % of mean generation")
    mape_pct: float = Field(description="Mean Absolute Percentage Error with epsilon floor")
    mean_actual_mw: float = Field(description="Mean actual generation in MW")
    total_energy_mwh: Optional[float] = None
    quantiles: Optional[ErrorQuantiles] = None

class CoverageStats(BaseModel):
    total_intervals: Optional[int] = None
    total_expected_intervals: Optional[int] = None
    evaluated_intervals: int
    missing_actuals: int
    missing_forecasts: int
    coverage_pct: float

class IntervalEvaluation(BaseModel):
    interval_id: str
    start_time: str
    hour: int
    sp_span: Optional[str] = None
    settlement_period: Optional[int] = None
    actual_mw: Optional[float]
    forecast_mw: Optional[float]
    publish_time: Optional[str]
    error_mw: Optional[float]
    abs_error_mw: Optional[float]
    status: str

class DailyAnalysisResponse(BaseModel):
    delivery_date: str
    decision_date: str
    cutoff_time: str
    cutoff_timestamp: str
    cutoff_description: str
    view_mode: str
    metrics: MetricsSummary
    coverage: CoverageStats
    intervals: List[IntervalEvaluation]

class DailyTrendItem(BaseModel):
    decision_date: str
    delivery_date: str
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    nmae_pct: float
    mean_actual_mw: float
    total_energy_mwh: float
    coverage_pct: float

class DiurnalProfileItem(BaseModel):
    period: int
    period_label: str
    sample_count: int
    mean_error_mw: float
    mae_mw: float
    rmse_mw: float

class MonthlySummaryMetrics(BaseModel):
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    nmae_pct: float
    mape_pct: float
    mean_actual_mw: float
    total_energy_delivered_mwh: float
    error_quantiles: ErrorQuantiles

class MonthlySummaryResponse(BaseModel):
    evaluation_scope: str
    decision_dates_span: str
    delivery_dates_span: str
    cutoff_preset: str
    cutoff_time: str
    cutoff_description: str
    view_mode: str
    summary_metrics: MonthlySummaryMetrics
    coverage: CoverageStats
    daily_trends: List[DailyTrendItem]
    diurnal_profile: List[DiurnalProfileItem]

class SyncRequest(BaseModel):
    start_date: str = "2025-12-31"
    end_date: str = "2026-02-01"

    @model_validator(mode="after")
    def validate_sync_dates(self) -> 'SyncRequest':
        try:
            d_start = datetime.strptime(self.start_date, "%Y-%m-%d").date()
            d_end = datetime.strptime(self.end_date, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Dates must be formatted as YYYY-MM-DD.")
        
        if d_start > d_end:
            raise ValueError("start_date must be less than or equal to end_date.")
            
        span_days = (d_end - d_start).days
        if span_days > 35:
            raise ValueError(f"Requested sync span ({span_days} days) exceeds maximum allowed range of 35 days.")
            
        if d_start.year < 2025 or d_end.year > 2026:
            raise ValueError("Sync requests are restricted to evaluation window 2025-2026.")
            
        return self

class SyncResponse(BaseModel):
    status: str
    actuals_ingested: int
    forecasts_ingested: int
    duration_seconds: float
    message: str

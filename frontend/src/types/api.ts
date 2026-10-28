/**
 * TypeScript API Response Contracts for WindSight
 * Mirrors backend Pydantic models from backend/app/api/schemas.py
 */

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  database: {
    path: string;
    actual_days_count: number;
    forecast_records_count: number;
    min_actual_date: string | null;
    max_actual_date: string | null;
  };
  default_cutoff_preset: string;
}

export interface CutoffPresetInfo {
  time: string;
  label: string;
  description: string;
}

export interface AvailableDatesResponse {
  min_date: string | null;
  max_date: string | null;
  total_days: number;
  primary_evaluation_window: {
    name: string;
    decision_dates: string[];
    delivery_dates: string[];
    total_decision_dates: number;
    total_delivery_hours: number;
    convention: string;
  };
  boundary_validation_window: {
    name: string;
    decision_date: string;
    delivery_date: string;
    total_hours: number;
    note: string;
  };
  cutoff_presets: Record<string, CutoffPresetInfo>;
}

export interface ErrorQuantiles {
  min: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  max: number;
}

export interface MetricsSummary {
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  nmae_pct: number;
  mape_pct: number;
  mean_actual_mw: number;
  total_energy_mwh?: number;
  total_energy_delivered_mwh?: number;
  quantiles?: ErrorQuantiles;
  error_quantiles?: ErrorQuantiles;
}

export interface CoverageStats {
  total_intervals?: number;
  total_expected_intervals?: number;
  evaluated_intervals: number;
  missing_actuals: number;
  missing_forecasts: number;
  coverage_pct: number;
}

export interface IntervalEvaluation {
  interval_id: string;
  start_time: string;
  hour: number;
  sp_span?: string;
  settlement_period?: number;
  actual_mw: number | null;
  forecast_mw: number | null;
  publish_time: string | null;
  error_mw: number | null;
  abs_error_mw: number | null;
  status: string;
}

export interface DailyAnalysisResponse {
  delivery_date: string;
  decision_date: string;
  cutoff_time: string;
  cutoff_timestamp: string;
  cutoff_description: string;
  view_mode: 'hourly' | 'half_hourly';
  metrics: MetricsSummary;
  coverage: CoverageStats;
  intervals: IntervalEvaluation[];
}

export interface DailyTrendItem {
  decision_date: string;
  delivery_date: string;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  nmae_pct: number;
  mean_actual_mw: number;
  total_energy_mwh: number;
  coverage_pct: number;
}

export interface DiurnalProfileItem {
  period: number;
  period_label: string;
  sample_count: number;
  mean_error_mw: number;
  mae_mw: number;
  rmse_mw: number;
}

export interface MonthlySummaryResponse {
  evaluation_scope: string;
  decision_dates_span: string;
  delivery_dates_span: string;
  cutoff_preset: string;
  cutoff_time: string;
  cutoff_description: string;
  view_mode: 'hourly' | 'half_hourly';
  summary_metrics: MetricsSummary;
  coverage: CoverageStats;
  daily_trends: DailyTrendItem[];
  diurnal_profile: DiurnalProfileItem[];
}

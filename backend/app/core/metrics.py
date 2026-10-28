"""
Quantitative Accuracy & Imbalance Risk Metrics
==============================================
Calculates industry-standard forecast evaluation metrics:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Mean Signed Error / Bias (Forecast - Actual)
- Normalized MAE (nMAE %)
- Mean Absolute Percentage Error (MAPE %) with floor protection
- Percentile distribution (P10, P50, P90)
"""

import math
from typing import List, Dict, Any, Optional

def calculate_mae(errors: List[float]) -> float:
    """Mean Absolute Error in MW."""
    if not errors:
        return 0.0
    return sum(abs(e) for e in errors) / len(errors)

def calculate_rmse(errors: List[float]) -> float:
    """Root Mean Squared Error in MW."""
    if not errors:
        return 0.0
    return math.sqrt(sum(e ** 2 for e in errors) / len(errors))

def calculate_bias(errors: List[float]) -> float:
    """
    Mean Signed Error in MW (Bias = Forecast - Actual).
    Positive: Over-forecasting (desk bought excess power, risk of low cashout).
    Negative: Under-forecasting (desk was short, risk of high system imbalance charges).
    """
    if not errors:
        return 0.0
    return sum(errors) / len(errors)

def calculate_nmae(mae: float, mean_actual: float) -> float:
    """Normalized MAE as percentage of mean actual outturn."""
    if mean_actual <= 0.0:
        return 0.0
    return (mae / mean_actual) * 100.0

def calculate_mape(actuals: List[float], forecasts: List[float], epsilon: float = 50.0) -> float:
    """
    Mean Absolute Percentage Error with an epsilon floor to prevent division-by-zero
    during calm low-wind periods.
    """
    if not actuals or len(actuals) != len(forecasts):
        return 0.0
    pct_errors = [
        abs(f - a) / max(a, epsilon) * 100.0
        for a, f in zip(actuals, forecasts)
    ]
    return sum(pct_errors) / len(pct_errors)

def calculate_percentiles(values: List[float]) -> Dict[str, float]:
    """Calculates empirical quantiles (min, P10, P25, P50, P75, P90, max)."""
    if not values:
        return {"min": 0.0, "p10": 0.0, "p25": 0.0, "p50": 0.0, "p75": 0.0, "p90": 0.0, "max": 0.0}
    
    s = sorted(values)
    n = len(s)
    
    def quantile(q: float) -> float:
        if n == 1:
            return s[0]
        idx = q * (n - 1)
        low = int(idx)
        high = min(low + 1, n - 1)
        weight = idx - low
        return s[low] * (1.0 - weight) + s[high] * weight

    return {
        "min": round(s[0], 2),
        "p10": round(quantile(0.10), 2),
        "p25": round(quantile(0.25), 2),
        "p50": round(quantile(0.50), 2),
        "p75": round(quantile(0.75), 2),
        "p90": round(quantile(0.90), 2),
        "max": round(s[-1], 2)
    }

def aggregate_hourly_actual(sp1_gen: float, sp2_gen: float) -> float:
    """
    Aggregates two constituent 30-minute settlement period observations (in MW)
    into the true average power outturn across the 60-minute hour:
    Actual_hour = (SP1 + SP2) / 2
    """
    return (sp1_gen + sp2_gen) / 2.0

"""
Unit Tests for Quantitative Metrics & Independence
==================================================
Tests accuracy formulas, edge cases, and mathematical properties.
"""

import math
import pytest
from backend.app.core.metrics import (
    calculate_mae,
    calculate_rmse,
    calculate_bias,
    calculate_nmae,
    calculate_mape,
    calculate_percentiles,
    aggregate_hourly_actual
)

def test_metric_independence_synthetic():
    """
    Proves that Hourly MAE and Step-Down MAE produce distinct numerical results
    when the forecast falls between the first and second half-hourly actuals.
    """
    synthetic_records = [
        {"y1": 100.0, "y2": 200.0, "fc": 150.0}, # Straddles: (100+200)/2 = 150 -> h_err=0, sd_errs=[-50, 50]
        {"y1": 300.0, "y2": 320.0, "fc": 400.0}  # Both under: (300+320)/2 = 310 -> h_err=90, sd_errs=[100, 80]
    ]
    
    # 1. Hourly calculation
    h_errors = [r["fc"] - aggregate_hourly_actual(r["y1"], r["y2"]) for r in synthetic_records]
    mae_h = calculate_mae(h_errors)
    rmse_h = calculate_rmse(h_errors)
    bias_h = calculate_bias(h_errors)
    
    # 2. Step-down calculation
    sd_errors = []
    for r in synthetic_records:
        sd_errors.extend([r["fc"] - r["y1"], r["fc"] - r["y2"]])
    mae_sd = calculate_mae(sd_errors)
    rmse_sd = calculate_rmse(sd_errors)
    bias_sd = calculate_bias(sd_errors)
    
    # Expected hand-calculated values:
    # Hourly errors: [0.0, 90.0] -> MAE = 45.0, RMSE = sqrt((0 + 8100)/2) = 63.64, Bias = 45.0
    # Step-down errors: [50.0, -50.0, 100.0, 80.0] -> MAE = (50+50+100+80)/4 = 70.0, Bias = 45.0
    assert abs(mae_h - 45.0) < 1e-6
    assert abs(mae_sd - 70.0) < 1e-6
    assert abs(bias_h - 45.0) < 1e-6
    assert abs(bias_sd - 45.0) < 1e-6
    assert mae_h != mae_sd, "Metrics must produce distinct values when straddling occurs"
    assert rmse_sd > rmse_h, "Step-down RMSE must be strictly greater than hourly RMSE"

def test_mae_empty_and_zero():
    assert calculate_mae([]) == 0.0
    assert calculate_mae([0.0, 0.0]) == 0.0
    assert calculate_mae([10.0, -10.0]) == 10.0

def test_rmse_empty_and_values():
    assert calculate_rmse([]) == 0.0
    # errors: [3.0, 4.0] -> sqrt((9 + 16)/2) = sqrt(12.5) ~ 3.5355
    assert abs(calculate_rmse([3.0, 4.0]) - math.sqrt(12.5)) < 1e-6

def test_bias_positive_negative():
    # Over-forecasting
    assert calculate_bias([100.0, 200.0]) == 150.0
    # Under-forecasting
    assert calculate_bias([-100.0, -200.0]) == -150.0
    # Balanced
    assert calculate_bias([100.0, -100.0]) == 0.0

def test_nmae_normalization():
    mae = 500.0
    mean_act = 10000.0
    # 500 / 10000 * 100 = 5.0%
    assert abs(calculate_nmae(mae, mean_act) - 5.0) < 1e-6
    assert calculate_nmae(mae, 0.0) == 0.0

def test_mape_with_epsilon_floor():
    actuals = [100.0, 0.0] # 0.0 tests epsilon protection
    forecasts = [110.0, 50.0] # err1: 10/100 = 10%, err2: 50/max(0, 50) = 100%
    mape = calculate_mape(actuals, forecasts, epsilon=50.0)
    # (10% + 100%) / 2 = 55%
    assert abs(mape - 55.0) < 1e-6

def test_percentiles_calculation():
    vals = [10, 20, 30, 40, 50]
    p = calculate_percentiles(vals)
    assert p["min"] == 10.0
    assert p["max"] == 50.0
    assert p["p50"] == 30.0
    assert p["p10"] < p["p25"] < p["p50"] < p["p75"] < p["p90"]

def test_hourly_aggregation():
    # 12,000 MW and 14,000 MW -> mean = 13,000 MW
    assert aggregate_hourly_actual(12000.0, 14000.0) == 13000.0

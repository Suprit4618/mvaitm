"""
Core Analysis Service
=====================
Implements point-in-time forecast selection, temporal harmonization,
and quantitative error evaluations across delivery dates and monthly horizons.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from backend.app.db.repository import Repository
from backend.app.core.metrics import (
    calculate_mae,
    calculate_rmse,
    calculate_bias,
    calculate_nmae,
    calculate_mape,
    calculate_percentiles,
    aggregate_hourly_actual
)

logger = logging.getLogger("windsight.analysis")

PRESET_CUTOFFS = {
    "09:00": {
        "time": "09:00:00",
        "label": "09:00 UTC",
        "description": "Pre-Auction Decision Point (Informs order bids prior to EPEX 09:20 & Nord Pool 09:50 auction closures)"
    },
    "11:00": {
        "time": "11:00:00",
        "label": "11:00 UTC (Recommended)",
        "description": "Post-Auction Position Review & Midday Continuous Rebalancing (Analytical Default Assumption)"
    },
    "14:00": {
        "time": "14:00:00",
        "label": "14:00 UTC",
        "description": "Early Afternoon Continuous Trading & Position Adjustment Window"
    },
    "17:00": {
        "time": "17:00:00",
        "label": "17:00 UTC",
        "description": "End-of-Day Continuous Trading Position Freeze"
    }
}

class AnalysisService:
    def __init__(self, repository: Repository):
        self.repo = repository

    def _resolve_cutoff(self, cutoff_preset: Optional[str], custom_cutoff: Optional[str]) -> tuple[str, str, str]:
        """Returns (cutoff_hhmm, cutoff_time_str, description)."""
        if custom_cutoff:
            cleaned = custom_cutoff.strip()
            # Normalize to HH:MM
            if len(cleaned) == 5 and cleaned[2] == ":":
                return cleaned, f"{cleaned}:00", f"Custom Decision Cutoff ({cleaned} UTC)"
        
        preset_key = cutoff_preset or "11:00"
        if preset_key not in PRESET_CUTOFFS:
            preset_key = "11:00"
            
        info = PRESET_CUTOFFS[preset_key]
        return preset_key, info["time"], info["description"]

    def evaluate_delivery_date(
        self,
        delivery_date: str,
        cutoff_preset: str = "11:00",
        custom_cutoff_time: Optional[str] = None,
        view_mode: str = "hourly"
    ) -> Dict[str, Any]:
        """
        Evaluates wind forecast performance for a single 24-hour delivery date.
        Under the D-1 convention, the decision date is delivery_date - 1 day.
        """
        # Parse delivery date
        dt_del = datetime.strptime(delivery_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        dt_dec = dt_del - timedelta(days=1)
        decision_date = dt_dec.strftime("%Y-%m-%d")
        
        preset_key, cutoff_time, cutoff_desc = self._resolve_cutoff(cutoff_preset, custom_cutoff_time)
        cutoff_iso = f"{decision_date}T{cutoff_time}Z"
        
        # 1. Fetch actuals (48 settlement periods)
        actuals = self.repo.get_actuals_for_delivery_date(delivery_date)
        actuals_by_sp = {a["settlement_period"]: a for a in actuals}
        
        # 2. Fetch point-in-time forecasts
        forecasts = self.repo.get_forecasts_for_delivery_date(delivery_date, cutoff_iso)
        forecasts_by_st = {f["start_time"]: f for f in forecasts}
        
        intervals = []
        actual_values = []
        forecast_values = []
        errors = []
        missing_actual_count = 0
        missing_forecast_count = 0

        if view_mode == "hourly":
            for h in range(24):
                hour_label = f"{h:02d}:00"
                start_time_iso = f"{delivery_date}T{hour_label}:00Z"
                sp1 = h * 2 + 1
                sp2 = h * 2 + 2
                
                a1 = actuals_by_sp.get(sp1)
                a2 = actuals_by_sp.get(sp2)
                fc = forecasts_by_st.get(start_time_iso)
                
                has_actual = a1 is not None and a2 is not None
                has_forecast = fc is not None
                
                if not has_actual:
                    missing_actual_count += 1
                if not has_forecast:
                    missing_forecast_count += 1
                    
                act_mw = None
                fc_mw = None
                err_mw = None
                abs_err = None
                
                if has_actual:
                    act_mw = round(aggregate_hourly_actual(a1["generation_mw"], a2["generation_mw"]), 1)
                if has_forecast:
                    fc_mw = fc["generation_mw"]
                    
                if has_actual and has_forecast:
                    err_mw = round(fc_mw - act_mw, 1)
                    abs_err = abs(err_mw)
                    actual_values.append(act_mw)
                    forecast_values.append(fc_mw)
                    errors.append(err_mw)
                    
                intervals.append({
                    "interval_id": f"H{h:02d}",
                    "start_time": start_time_iso,
                    "hour": h,
                    "sp_span": f"SP {sp1:02d}-{sp2:02d}",
                    "actual_mw": act_mw,
                    "forecast_mw": fc_mw,
                    "publish_time": fc["publish_time"] if fc else None,
                    "error_mw": err_mw,
                    "abs_error_mw": abs_err,
                    "status": "complete" if (has_actual and has_forecast) else "missing"
                })

        else: # half_hourly view
            for sp in range(1, 49):
                h = (sp - 1) // 2
                hour_label = f"{h:02d}:00"
                fc_start_time = f"{delivery_date}T{hour_label}:00Z"
                
                a = actuals_by_sp.get(sp)
                fc = forecasts_by_st.get(fc_start_time)
                
                has_actual = a is not None
                has_forecast = fc is not None
                
                if not has_actual:
                    missing_actual_count += 1
                if not has_forecast:
                    missing_forecast_count += 1
                    
                act_mw = a["generation_mw"] if has_actual else None
                fc_mw = fc["generation_mw"] if has_forecast else None
                err_mw = round(fc_mw - act_mw, 1) if (has_actual and has_forecast) else None
                abs_err = abs(err_mw) if err_mw is not None else None
                
                if has_actual and has_forecast:
                    actual_values.append(float(act_mw))
                    forecast_values.append(float(fc_mw))
                    errors.append(err_mw)
                    
                sp_start_iso = a["start_time"] if a else f"{delivery_date}T{h:02d}:{'30' if sp%2==0 else '00'}:00Z"
                
                intervals.append({
                    "interval_id": f"SP{sp:02d}",
                    "settlement_period": sp,
                    "start_time": sp_start_iso,
                    "hour": h,
                    "actual_mw": act_mw,
                    "forecast_mw": fc_mw,
                    "publish_time": fc["publish_time"] if fc else None,
                    "error_mw": err_mw,
                    "abs_error_mw": abs_err,
                    "status": "complete" if (has_actual and has_forecast) else "missing"
                })

        # Calculate metrics
        mae = round(calculate_mae(errors), 2)
        rmse = round(calculate_rmse(errors), 2)
        bias = round(calculate_bias(errors), 2)
        mean_act = round(sum(actual_values) / len(actual_values), 2) if actual_values else 0.0
        nmae = round(calculate_nmae(mae, mean_act), 2)
        mape = round(calculate_mape(actual_values, forecast_values), 2)
        quantiles = calculate_percentiles(errors)
        
        # Total energy delivered (MWh)
        # In hourly view: each hour is 1h -> sum(act_mw)
        # In half-hourly view: each SP is 0.5h -> sum(act_mw) * 0.5
        total_energy_mwh = round(sum(actual_values) if view_mode == "hourly" else sum(actual_values) * 0.5, 1)

        return {
            "delivery_date": delivery_date,
            "decision_date": decision_date,
            "cutoff_time": cutoff_time[:5],
            "cutoff_timestamp": cutoff_iso,
            "cutoff_description": cutoff_desc,
            "view_mode": view_mode,
            "metrics": {
                "mae_mw": mae,
                "rmse_mw": rmse,
                "bias_mw": bias,
                "nmae_pct": nmae,
                "mape_pct": mape,
                "mean_actual_mw": mean_act,
                "total_energy_mwh": total_energy_mwh,
                "quantiles": quantiles
            },
            "coverage": {
                "total_intervals": len(intervals),
                "evaluated_intervals": len(errors),
                "missing_actuals": missing_actual_count,
                "missing_forecasts": missing_forecast_count,
                "coverage_pct": round(len(errors) / len(intervals) * 100.0, 1) if intervals else 0.0
            },
            "intervals": intervals
        }

    def evaluate_cutoff_sensitivity(
        self,
        delivery_date: str,
        view_mode: str = "hourly"
    ) -> Dict[str, Any]:
        """
        Evaluates forecast error sensitivity across standard cutoff presets (09:00, 11:00, 14:00, 17:00 UTC)
        for a target delivery day, quantifying how decision timing impacts forecast accuracy.
        """
        presets = ["09:00", "11:00", "14:00", "17:00"]
        evaluations = {}
        for p in presets:
            evaluations[p] = self.evaluate_delivery_date(
                delivery_date=delivery_date,
                cutoff_preset=p,
                view_mode=view_mode
            )

        base_mae = evaluations["11:00"]["metrics"]["mae_mw"]
        dt_del = datetime.strptime(delivery_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        dt_dec = dt_del - timedelta(days=1)
        decision_date = dt_dec.strftime("%Y-%m-%d")

        comparisons = []
        for p in presets:
            ev = evaluations[p]
            m = ev["metrics"]
            delta = round(m["mae_mw"] - base_mae, 2)
            comparisons.append({
                "preset": p,
                "cutoff_time": ev["cutoff_time"],
                "description": ev["cutoff_description"],
                "mae_mw": m["mae_mw"],
                "rmse_mw": m["rmse_mw"],
                "bias_mw": m["bias_mw"],
                "nmae_pct": m["nmae_pct"],
                "delta_mae_mw": delta
            })

        return {
            "decision_date": decision_date,
            "delivery_date": delivery_date,
            "view_mode": view_mode,
            "comparisons": comparisons
        }

    def evaluate_primary_window(
        self,
        cutoff_preset: str = "11:00",
        custom_cutoff_time: Optional[str] = None,
        view_mode: str = "hourly"
    ) -> Dict[str, Any]:
        """
        Evaluates the Primary Evaluation Window:
        Decision Dates: 2026-01-01 to 2026-01-31 (31 decision days)
        Delivery Dates: 2026-01-02 to 2026-02-01 (31 delivery days)
        Exactly 744 delivery hours.
        """
        preset_key, cutoff_time, cutoff_desc = self._resolve_cutoff(cutoff_preset, custom_cutoff_time)
        
        daily_summaries = []
        all_actuals = []
        all_forecasts = []
        all_errors = []
        
        # Diurnal pattern tracking (hour 0..23 or SP 1..48)
        diurnal_errors = defaultdict(list)
        
        total_missing_actuals = 0
        total_missing_forecasts = 0
        total_expected_intervals = 744 if view_mode == "hourly" else 1488

        for day in range(1, 32):
            dt_dec = datetime(2026, 1, day, tzinfo=timezone.utc)
            dt_del = dt_dec + timedelta(days=1)
            del_str = dt_del.strftime("%Y-%m-%d")
            
            day_eval = self.evaluate_delivery_date(
                delivery_date=del_str,
                cutoff_preset=preset_key,
                custom_cutoff_time=custom_cutoff_time,
                view_mode=view_mode
            )
            
            m = day_eval["metrics"]
            cov = day_eval["coverage"]
            total_missing_actuals += cov["missing_actuals"]
            total_missing_forecasts += cov["missing_forecasts"]
            
            daily_summaries.append({
                "decision_date": day_eval["decision_date"],
                "delivery_date": del_str,
                "mae_mw": m["mae_mw"],
                "rmse_mw": m["rmse_mw"],
                "bias_mw": m["bias_mw"],
                "nmae_pct": m["nmae_pct"],
                "mean_actual_mw": m["mean_actual_mw"],
                "total_energy_mwh": m["total_energy_mwh"],
                "coverage_pct": cov["coverage_pct"]
            })
            
            for item in day_eval["intervals"]:
                if item["error_mw"] is not None:
                    all_errors.append(item["error_mw"])
                    all_actuals.append(item["actual_mw"])
                    all_forecasts.append(item["forecast_mw"])
                    
                    key = item["hour"] if view_mode == "hourly" else item["settlement_period"]
                    diurnal_errors[key].append(item["error_mw"])

        # Aggregate monthly metrics across all 744 hours
        month_mae = round(calculate_mae(all_errors), 2)
        month_rmse = round(calculate_rmse(all_errors), 2)
        month_bias = round(calculate_bias(all_errors), 2)
        mean_act = round(sum(all_actuals) / len(all_actuals), 2) if all_actuals else 0.0
        month_nmae = round(calculate_nmae(month_mae, mean_act), 2)
        month_mape = round(calculate_mape(all_actuals, all_forecasts), 2)
        month_quantiles = calculate_percentiles(all_errors)
        total_energy = round(sum(d["total_energy_mwh"] for d in daily_summaries), 1)

        # Diurnal profile
        diurnal_profile = []
        for key in sorted(diurnal_errors.keys()):
            errs = diurnal_errors[key]
            diurnal_profile.append({
                "period": key,
                "period_label": f"{key:02d}:00" if view_mode == "hourly" else f"SP {key:02d}",
                "sample_count": len(errs),
                "mean_error_mw": round(calculate_bias(errs), 2),
                "mae_mw": round(calculate_mae(errs), 2),
                "rmse_mw": round(calculate_rmse(errs), 2)
            })

        return {
            "evaluation_scope": "PRIMARY_EVALUATION_WINDOW",
            "decision_dates_span": "2026-01-01 to 2026-01-31 (31 decision days)",
            "delivery_dates_span": "2026-01-02 to 2026-02-01 (31 delivery days)",
            "cutoff_preset": preset_key,
            "cutoff_time": cutoff_time[:5],
            "cutoff_description": cutoff_desc,
            "view_mode": view_mode,
            "summary_metrics": {
                "mae_mw": month_mae,
                "rmse_mw": month_rmse,
                "bias_mw": month_bias,
                "nmae_pct": month_nmae,
                "mape_pct": month_mape,
                "mean_actual_mw": mean_act,
                "total_energy_delivered_mwh": total_energy,
                "error_quantiles": month_quantiles
            },
            "coverage": {
                "total_expected_intervals": total_expected_intervals,
                "evaluated_intervals": len(all_errors),
                "missing_actuals": total_missing_actuals,
                "missing_forecasts": total_missing_forecasts,
                "coverage_pct": round(len(all_errors) / total_expected_intervals * 100.0, 1) if total_expected_intervals else 0.0
            },
            "daily_trends": daily_summaries,
            "diurnal_profile": diurnal_profile
        }

    def evaluate_boundary_window(
        self,
        cutoff_preset: str = "11:00",
        custom_cutoff_time: Optional[str] = None,
        view_mode: str = "hourly"
    ) -> Dict[str, Any]:
        """
        Evaluates Boundary Validation Window:
        Decision Date: 2025-12-31
        Delivery Date: 2026-01-01 (24 hours / 48 SPs).
        Kept separate from Primary January metrics.
        """
        eval_res = self.evaluate_delivery_date(
            delivery_date="2026-01-01",
            cutoff_preset=cutoff_preset,
            custom_cutoff_time=custom_cutoff_time,
            view_mode=view_mode
        )
        eval_res["evaluation_scope"] = "BOUNDARY_VALIDATION_WINDOW"
        eval_res["note"] = "Boundary check for 1 Jan 2026 delivery, decided on 31 Dec 2025. Kept independent from primary metrics."
        return eval_res

import React from 'react';
import { Target, TrendingUp, AlertTriangle, Zap, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { MetricsSummary, CoverageStats } from '../types/api';
import { formatMW, formatSignedMW, formatPercent, formatMWh } from '../utils/formatters';

interface KpiGridProps {
  metrics: MetricsSummary;
  coverage: CoverageStats;
  viewMode: 'hourly' | 'half_hourly';
}

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics, coverage, viewMode }) => {
  const isOverforecast = metrics.bias_mw > 0;
  const rmseToMaeRatio = metrics.mae_mw > 0 ? (metrics.rmse_mw / metrics.mae_mw).toFixed(2) : '1.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5">
      {/* 1. Hero Bento Card: Mean Absolute Error (MAE) + nMAE (Span 2 cols on lg) */}
      <div className="lg:col-span-2 bg-white border border-[#E7E5DE] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#777C76] mb-1.5">
            <span className="font-semibold text-[#202521] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#176B4D]" />
              Mean Absolute Error (MAE)
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#176B4D]/10 text-[#176B4D] border border-[#176B4D]/20">
              nMAE: {formatPercent(metrics.nmae_pct)}
            </span>
          </div>

          <div className="text-3xl font-bold font-mono tracking-tight text-[#202521] mt-1">
            {formatMW(metrics.mae_mw)}
          </div>
        </div>

        <div className="text-[11px] text-[#777C76] mt-3 pt-2.5 border-t border-[#E7E5DE]/80 flex items-center justify-between">
          <span>Average hourly volume miss</span>
          <span className="font-mono text-[#202521]">
            P50: {formatMW(metrics.quantiles?.p50 ?? 0)}
          </span>
        </div>
      </div>

      {/* 2. Hero Bento Card: Forecast Bias & Cashout Exposure (Span 2 cols on lg) */}
      <div className="lg:col-span-2 bg-white border border-[#E7E5DE] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#777C76] mb-1.5">
            <span className="font-semibold text-[#202521] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${isOverforecast ? 'text-amber-600' : 'text-[#2B6CB0]'}`} />
              Forecast Bias &amp; Exposure
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isOverforecast
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {isOverforecast ? (
                <>
                  <ArrowUpRight className="w-3 h-3 text-amber-700" /> SHORT Imbalance Risk
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3 h-3 text-blue-700" /> LONG Imbalance Surplus
                </>
              )}
            </span>
          </div>

          <div
            className={`text-3xl font-bold font-mono tracking-tight mt-1 ${
              isOverforecast ? 'text-amber-700' : 'text-[#2B6CB0]'
            }`}
          >
            {formatSignedMW(metrics.bias_mw)}
          </div>
        </div>

        <div className="text-[11px] text-[#777C76] mt-3 pt-2.5 border-t border-[#E7E5DE]/80 truncate">
          {isOverforecast
            ? 'Deficit cashed out at System Buy Price (SBP)'
            : 'Surplus cashed out at System Sell Price (SSP)'}
        </div>
      </div>

      {/* 3. Volatility & Peak Error (RMSE) (Span 1 col on lg) */}
      <div className="lg:col-span-1 bg-white border border-[#E7E5DE] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#777C76] mb-1.5">
            <span className="font-semibold text-[#202521] uppercase tracking-wider text-[11px] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#777C76]" />
              RMSE
            </span>
          </div>

          <div className="text-xl font-bold font-mono tracking-tight text-[#202521] mt-1">
            {formatMW(metrics.rmse_mw)}
          </div>
        </div>

        <div className="text-[11px] text-[#777C76] mt-3 pt-2.5 border-t border-[#E7E5DE]/80">
          Penalty: <span className="font-mono font-medium text-[#202521]">{rmseToMaeRatio}x</span> MAE
        </div>
      </div>

      {/* 4. Generation Outturn & Interval Coverage (Span 1 col on lg) */}
      <div className="lg:col-span-1 bg-white border border-[#E7E5DE] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#777C76] mb-1.5">
            <span className="font-semibold text-[#202521] uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#176B4D]" />
              Mean Outturn
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#176B4D]" />
          </div>

          <div className="text-xl font-bold font-mono tracking-tight text-[#202521] mt-1">
            {formatMW(metrics.mean_actual_mw)}
          </div>
        </div>

        <div className="text-[11px] text-[#777C76] mt-3 pt-2.5 border-t border-[#E7E5DE]/80 flex items-center justify-between">
          <span title={`Total generation delivered across ${coverage.evaluated_intervals} ${viewMode === 'hourly' ? 'hours' : 'settlement periods'}`}>
            Total: {formatMWh(metrics.total_energy_mwh || metrics.total_energy_delivered_mwh)}
          </span>
          <span className="font-mono text-[#176B4D] font-medium" title={`${coverage.evaluated_intervals}/${coverage.total_intervals || coverage.total_expected_intervals} ${viewMode === 'hourly' ? 'hours' : 'SPs'} evaluated`}>
            {formatPercent(coverage.coverage_pct)}
          </span>
        </div>
      </div>
    </div>
  );
};

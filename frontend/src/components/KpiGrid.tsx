import React from 'react';
import { Target, TrendingUp, AlertTriangle, Percent, Zap, CheckCircle } from 'lucide-react';
import type { MetricsSummary, CoverageStats } from '../types/api';
import { formatMW, formatSignedMW, formatPercent, formatMWh } from '../utils/formatters';

interface KpiGridProps {
  metrics: MetricsSummary;
  coverage: CoverageStats;
  viewMode: 'hourly' | 'half_hourly';
}

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics, coverage, viewMode }) => {
  const isOverforecast = metrics.bias_mw > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. MAE Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Mean Absolute Error</span>
          <Target className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-xl font-bold font-mono text-slate-100">
          {formatMW(metrics.mae_mw)}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Average magnitude of volume miss
        </div>
      </div>

      {/* 2. RMSE Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">RMSE</span>
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="text-xl font-bold font-mono text-slate-100">
          {formatMW(metrics.rmse_mw)}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Heavy penalty on peak errors
        </div>
      </div>

      {/* 3. Bias Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Forecast Bias</span>
          <AlertTriangle className={`w-3.5 h-3.5 ${isOverforecast ? 'text-amber-400' : 'text-cyan-400'}`} />
        </div>
        <div className={`text-xl font-bold font-mono ${isOverforecast ? 'text-amber-300' : 'text-cyan-300'}`}>
          {formatSignedMW(metrics.bias_mw)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={isOverforecast ? 'Over-forecast (Long exposure)' : 'Under-forecast (Short exposure)'}>
          {isOverforecast ? '⚠️ Over-forecast (Long)' : '⚠️ Under-forecast (Short)'}
        </div>
      </div>

      {/* 4. Normalized MAE Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Normalized Error</span>
          <Percent className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-xl font-bold font-mono text-emerald-400">
          {formatPercent(metrics.nmae_pct)}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          nMAE (Error / Mean Actual)
        </div>
      </div>

      {/* 5. Mean Actual & Energy */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Mean Outturn</span>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-xl font-bold font-mono text-slate-100">
          {formatMW(metrics.mean_actual_mw)}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Total: {formatMWh(metrics.total_energy_mwh || metrics.total_energy_delivered_mwh)}
        </div>
      </div>

      {/* 6. Coverage Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Interval Coverage</span>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-xl font-bold font-mono text-emerald-400">
          {formatPercent(coverage.coverage_pct)}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {coverage.evaluated_intervals} / {coverage.total_intervals || coverage.total_expected_intervals} {viewMode === 'hourly' ? 'hours' : 'SPs'}
        </div>
      </div>
    </div>
  );
};

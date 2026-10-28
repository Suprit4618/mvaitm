import React from 'react';
import { Clock, TrendingDown, TrendingUp, Check, ArrowRight } from 'lucide-react';
import type { CutoffComparisonResponse } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';

interface CutoffSensitivityCardProps {
  comparisonData: CutoffComparisonResponse | null;
  currentPreset: string;
  onSelectPreset: (preset: string) => void;
  loading: boolean;
}

export const CutoffSensitivityCard: React.FC<CutoffSensitivityCardProps> = ({
  comparisonData,
  currentPreset,
  onSelectPreset,
  loading
}) => {
  if (loading || !comparisonData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse text-xs text-slate-400">
        Evaluating cutoff sensitivity across 09:00, 11:00, 14:00, and 17:00 UTC...
      </div>
    );
  }

  const { comparisons, delivery_date, decision_date } = comparisonData;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-3 pb-2 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200 m-0">
              Cutoff Sensitivity Matrix (Decision Timing Impact)
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/50 text-cyan-300">
              Objective 5 Answered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            How changing the internal procurement decision cutoff alters forecast accuracy on {delivery_date} (Decided {decision_date})
          </p>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Baseline: <span className="text-emerald-400 font-semibold">11:00 UTC (Midday Default)</span>
        </div>
      </div>

      {/* 4-Column Sensitivity Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {comparisons.map((item) => {
          const isSelected = currentPreset === item.preset;
          const isBaseline = item.preset === '11:00';
          const isBetterThanBaseline = item.delta_mae_mw < 0;
          const isWorseThanBaseline = item.delta_mae_mw > 0;

          return (
            <div
              key={item.preset}
              onClick={() => onSelectPreset(item.preset)}
              className={`p-3 rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div>
                {/* Header inside card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {item.cutoff_time} UTC
                    </span>
                    {isBaseline && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                        Default
                      </span>
                    )}
                  </div>
                  {isSelected ? (
                    <span className="text-[10px] flex items-center gap-1 text-cyan-400 font-semibold">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5">
                      Select <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-1 mb-2.5" title={item.description}>
                  {item.preset === '09:00' && 'Pre-Auction Gate Closure'}
                  {item.preset === '11:00' && 'Midday Position Review (Default)'}
                  {item.preset === '14:00' && 'Afternoon Rebalancing'}
                  {item.preset === '17:00' && 'Evening Position Close'}
                </div>

                {/* Metrics */}
                <div className="space-y-1.5 border-t border-slate-800/80 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">MAE:</span>
                    <span className="font-mono font-bold text-slate-200">{formatMW(item.mae_mw)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bias:</span>
                    <span className={`font-mono font-semibold ${item.bias_mw > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {formatSignedMW(item.bias_mw)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">nMAE:</span>
                    <span className="font-mono text-emerald-400 font-medium">{item.nmae_pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Delta vs 11:00 UTC */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">vs 11:00 Baseline:</span>
                {isBaseline ? (
                  <span className="text-slate-400 font-mono">Reference</span>
                ) : isBetterThanBaseline ? (
                  <span className="font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    {item.delta_mae_mw} MW
                  </span>
                ) : isWorseThanBaseline ? (
                  <span className="font-mono font-bold text-rose-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +{item.delta_mae_mw} MW
                  </span>
                ) : (
                  <span className="text-slate-400 font-mono">0 MW (identical)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

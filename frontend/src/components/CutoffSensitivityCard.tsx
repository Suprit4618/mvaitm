import React from 'react';
import { Clock, TrendingDown, TrendingUp, Check } from 'lucide-react';
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
      <div className="bg-white border border-[#E7E5DE] rounded-xl p-5 text-xs text-[#777C76] animate-pulse">
        Evaluating cutoff sensitivity across 09:00, 11:00, 14:00, and 17:00 UTC...
      </div>
    );
  }

  const { comparisons, delivery_date, decision_date } = comparisonData;

  return (
    <div className="bg-white border border-[#E7E5DE] rounded-xl p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-[#E7E5DE] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#176B4D]" />
            <h3 className="text-base font-semibold text-[#202521] m-0 tracking-tight">
              Decision Cutoff Sensitivity Matrix
            </h3>
          </div>
          <p className="text-xs text-[#777C76] mt-0.5">
            Forecast accuracy across trading cutoffs for delivery on {delivery_date} (Decided {decision_date})
          </p>
        </div>

        <div className="text-xs text-[#777C76]">
          Baseline: <span className="font-semibold text-[#202521]">11:00 UTC (Midday Review)</span>
        </div>
      </div>

      {/* 4-Column Decision Support Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {comparisons.map((item) => {
          const isSelected = currentPreset === item.preset;
          const isBaseline = item.preset === '11:00';
          const isBetterThanBaseline = item.delta_mae_mw < 0;
          const isWorseThanBaseline = item.delta_mae_mw > 0;

          return (
            <div
              key={item.preset}
              onClick={() => onSelectPreset(item.preset)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#F7F6F2]/70 border-[#176B4D] ring-1 ring-[#176B4D]/30 shadow-2xs'
                  : 'bg-white border-[#E7E5DE] hover:border-[#176B4D]/40 hover:bg-[#F7F6F2]/30'
              }`}
            >
              <div>
                {/* Header inside card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold text-[#202521]">
                      {item.cutoff_time} UTC
                    </span>
                    {isBaseline && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-[#176B4D]/10 text-[#176B4D] border border-[#176B4D]/20">
                        Baseline
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-[11px] flex items-center gap-1 text-[#176B4D] font-semibold">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#777C76] line-clamp-1 mb-3">
                  {item.preset === '09:00' && 'Pre-Auction Gate Closure'}
                  {item.preset === '11:00' && 'Midday Position Review (Baseline)'}
                  {item.preset === '14:00' && 'Afternoon Rebalancing'}
                  {item.preset === '17:00' && 'Evening Position Close'}
                </div>

                {/* Metrics */}
                <div className="space-y-1.5 border-t border-[#E7E5DE] pt-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#777C76]">MAE:</span>
                    <span className="font-mono font-bold text-[#202521]">{formatMW(item.mae_mw)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#777C76]">Bias:</span>
                    <span
                      className={`font-mono font-medium ${
                        item.bias_mw > 0 ? 'text-amber-800' : 'text-[#2B6CB0]'
                      }`}
                    >
                      {formatSignedMW(item.bias_mw)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#777C76]">nMAE:</span>
                    <span className="font-mono text-[#176B4D] font-medium">{item.nmae_pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Delta vs 11:00 UTC */}
              <div className="mt-3 pt-2.5 border-t border-[#E7E5DE] flex items-center justify-between text-xs">
                <span className="text-[#777C76]">vs 11:00 Baseline:</span>
                {isBaseline ? (
                  <span className="text-[#777C76] font-mono">Reference</span>
                ) : isBetterThanBaseline ? (
                  <span className="font-mono font-bold text-[#176B4D] flex items-center gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {item.delta_mae_mw} MW
                  </span>
                ) : isWorseThanBaseline ? (
                  <span className="font-mono font-bold text-amber-800 flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{item.delta_mae_mw} MW
                  </span>
                ) : (
                  <span className="text-[#777C76] font-mono">0 MW</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Footnote */}
      <div className="mt-3.5 pt-2.5 border-t border-[#E7E5DE]/80 text-[11px] text-[#777C76] flex items-center justify-between">
        <span>
          Note: 11:00 UTC is an analytical desk review baseline, not an official auction deadline.
        </span>
        <span className="hidden sm:inline">
          Historical lower MAE does not guarantee future outperformance.
        </span>
      </div>
    </div>
  );
};

import { Calendar, Clock, HelpCircle, Check, ArrowRight } from 'lucide-react';
import type { AvailableDatesResponse } from '../types/api';

interface ControlBarProps {
  datesInfo: AvailableDatesResponse | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  dateMode: 'decision' | 'delivery';
  onDateModeChange: (mode: 'decision' | 'delivery') => void;
  cutoffPreset: string;
  onCutoffPresetChange: (preset: string) => void;
  customCutoff: string;
  onCustomCutoffChange: (time: string) => void;
  viewMode: 'hourly' | 'half_hourly';
  onViewModeChange: (mode: 'hourly' | 'half_hourly') => void;
  onApply: () => void;
  loading: boolean;
  onOpenMethodology: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  datesInfo,
  selectedDate,
  onDateChange,
  dateMode,
  onDateModeChange,
  cutoffPreset,
  onCutoffPresetChange,
  customCutoff,
  onCustomCutoffChange,
  viewMode,
  onViewModeChange,
  onApply,
  loading,
  onOpenMethodology
}) => {
  // Available dates for January 2026
  const availableDecisionDates = datesInfo?.primary_evaluation_window.decision_dates || [
    ...Array.from({ length: 31 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)
  ];
  const availableDeliveryDates = datesInfo?.primary_evaluation_window.delivery_dates || [
    ...Array.from({ length: 31 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, i + 2));
      return d.toISOString().slice(0, 10);
    })
  ];

  const currentDates = dateMode === 'decision' ? availableDecisionDates : availableDeliveryDates;

  // Compute paired date
  let pairedLabel = '';
  try {
    const d = new Date(`${selectedDate}T00:00:00Z`);
    if (dateMode === 'decision') {
      const del = new Date(d.getTime() + 86400000);
      pairedLabel = `Delivery Date: ${del.toISOString().slice(0, 10)} (SP 1–48)`;
    } else {
      const dec = new Date(d.getTime() - 86400000);
      pairedLabel = `Decision Date: ${dec.toISOString().slice(0, 10)} (Day-Ahead D-1)`;
    }
  } catch {
    pairedLabel = '';
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 shadow-sm">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Date Mode & Picker */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Perspective Switcher */}
            <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onDateModeChange('decision')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  dateMode === 'decision'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Decision Date (D-1)
              </button>
              <button
                type="button"
                onClick={() => onDateModeChange('delivery')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  dateMode === 'delivery'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Delivery Date (D)
              </button>
            </div>

            {/* Date Selection */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                list="date-options"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono w-32"
              />
              <datalist id="date-options">
                {currentDates.map((dateStr) => (
                  <option key={dateStr} value={dateStr} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Cutoff Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Cutoff (UTC):
            </span>
            <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800 text-xs">
              {['09:00', '11:00', '14:00', '17:00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onCutoffPresetChange(preset)}
                  className={`px-2.5 py-1 rounded font-mono transition-colors cursor-pointer ${
                    cutoffPreset === preset
                      ? 'bg-cyan-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={
                    preset === '11:00'
                      ? '11:00 UTC (Recommended Default: Post-Auction Review Assumption)'
                      : `${preset} UTC Trading Cutoff Preset`
                  }
                >
                  {preset}
                  {preset === '11:00' && <span className="ml-1 text-[10px] text-cyan-200">★</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onCutoffPresetChange('custom')}
                className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                  cutoffPreset === 'custom'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom
              </button>
            </div>

            {cutoffPreset === 'custom' && (
              <input
                type="text"
                placeholder="HH:MM"
                value={customCutoff}
                onChange={(e) => onCustomCutoffChange(e.target.value)}
                maxLength={5}
                className="w-16 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md px-2 py-1 text-center font-mono focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            )}
          </div>

          {/* Temporal View Mode & Actions */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onViewModeChange('hourly')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'hourly'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Primary Method: Aggregates half-hourly actuals to compare 1-hour power averages"
              >
                Hourly View
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('half_hourly')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'half_hourly'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Secondary Method: Evaluates settlement periods 1–48 directly against the hourly forecast"
              >
                Half-Hourly (SP)
              </button>
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={onApply}
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? 'Evaluating...' : 'Apply'}</span>
            </button>

            {/* Methodology Explainer Link */}
            <button
              type="button"
              onClick={onOpenMethodology}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Read methodology, assumptions, and interval harmonization notes"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Informative Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-300">Selected Perspective:</span>
            <span className="text-emerald-400 font-mono font-medium">{selectedDate}</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-slate-300 font-medium">{pairedLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-400/90 font-medium">⚠️ Operational Assumption:</span>
            <span>
              {cutoffPreset === '11:00'
                ? '11:00 UTC is an analytical desk review assumption, not an official auction deadline.'
                : `Cutoff set to ${cutoffPreset} UTC.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

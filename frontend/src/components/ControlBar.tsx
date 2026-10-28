import React from 'react';
import { Calendar, Clock, HelpCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const currentIndex = currentDates.indexOf(selectedDate);

  const handlePrevDay = () => {
    if (currentIndex > 0) {
      onDateChange(currentDates[currentIndex - 1]);
    }
  };

  const handleNextDay = () => {
    if (currentIndex >= 0 && currentIndex < currentDates.length - 1) {
      onDateChange(currentDates[currentIndex + 1]);
    }
  };

  // Compute paired date description
  let pairedLabel = '';
  try {
    const d = new Date(`${selectedDate}T00:00:00Z`);
    if (dateMode === 'decision') {
      const del = new Date(d.getTime() + 86400000);
      pairedLabel = `Delivery: ${del.toISOString().slice(0, 10)} (SP 1–48)`;
    } else {
      const dec = new Date(d.getTime() - 86400000);
      pairedLabel = `Decision: ${dec.toISOString().slice(0, 10)} (D-1 Cutoff)`;
    }
  } catch {
    pairedLabel = '';
  }

  return (
    <div className="bg-white border-b border-[#E7E5DE] px-6 py-3.5 shadow-2xs">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Group 1: Perspective & Date */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Perspective Switcher */}
            <div className="inline-flex rounded-lg bg-[#F7F6F2] p-0.5 border border-[#E7E5DE] text-xs">
              <button
                type="button"
                onClick={() => onDateModeChange('decision')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  dateMode === 'decision'
                    ? 'bg-white text-[#202521] shadow-2xs font-semibold'
                    : 'text-[#777C76] hover:text-[#202521]'
                }`}
                title="Evaluate purchasing decisions made on day-ahead D-1"
              >
                Decision Date (D-1)
              </button>
              <button
                type="button"
                onClick={() => onDateModeChange('delivery')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  dateMode === 'delivery'
                    ? 'bg-white text-[#202521] shadow-2xs font-semibold'
                    : 'text-[#777C76] hover:text-[#202521]'
                }`}
                title="Evaluate outturn delivered on delivery day D"
              >
                Delivery Date (D)
              </button>
            </div>

            {/* Date Selector with Steppers */}
            <div className="flex items-center gap-1 bg-[#F7F6F2] border border-[#E7E5DE] rounded-lg p-0.5">
              <button
                type="button"
                onClick={handlePrevDay}
                disabled={currentIndex <= 0}
                className="p-1 rounded-md text-[#777C76] hover:text-[#202521] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-[#777C76]" />
                <input
                  type="text"
                  list="date-options"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="bg-transparent border-0 text-[#202521] text-xs font-mono font-medium focus:outline-hidden w-24 text-center cursor-pointer"
                />
                <datalist id="date-options">
                  {currentDates.map((dateStr) => (
                    <option key={dateStr} value={dateStr} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                disabled={currentIndex >= currentDates.length - 1}
                className="p-1 rounded-md text-[#777C76] hover:text-[#202521] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                title="Next day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Group 2: Cutoff Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#777C76] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#176B4D]" />
              Cutoff:
            </span>

            <div className="inline-flex rounded-lg bg-[#F7F6F2] p-0.5 border border-[#E7E5DE] text-xs font-mono">
              {['09:00', '11:00', '14:00', '17:00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onCutoffPresetChange(preset)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    cutoffPreset === preset
                      ? 'bg-[#176B4D] text-white font-semibold shadow-2xs'
                      : 'text-[#777C76] hover:text-[#202521]'
                  }`}
                  title={
                    preset === '11:00'
                      ? '11:00 UTC (Recommended Baseline: Midday Desk Review)'
                      : `${preset} UTC Trading Cutoff Preset`
                  }
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onCutoffPresetChange('custom')}
                className={`px-2 py-1 rounded-md font-sans text-xs transition-all cursor-pointer ${
                  cutoffPreset === 'custom'
                    ? 'bg-[#176B4D] text-white font-semibold shadow-2xs'
                    : 'text-[#777C76] hover:text-[#202521]'
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
                className="w-16 bg-[#F7F6F2] border border-[#E7E5DE] text-[#202521] text-xs rounded-lg px-2 py-1 text-center font-mono focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
            )}
          </div>

          {/* Group 3: View Mode & Primary Action */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-[#F7F6F2] p-0.5 border border-[#E7E5DE] text-xs font-medium">
              <button
                type="button"
                onClick={() => onViewModeChange('hourly')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'hourly'
                    ? 'bg-white text-[#202521] font-semibold shadow-2xs'
                    : 'text-[#777C76] hover:text-[#202521]'
                }`}
                title="Hourly like-for-like comparison (actuals averaged across two settlement periods)"
              >
                Hourly View
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('half_hourly')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'half_hourly'
                    ? 'bg-white text-[#202521] font-semibold shadow-2xs'
                    : 'text-[#777C76] hover:text-[#202521]'
                }`}
                title="Half-hourly resolution across settlement periods 1–48"
              >
                Half-Hourly (SP)
              </button>
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={onApply}
              disabled={loading}
              className="px-3.5 py-1.5 bg-[#176B4D] hover:bg-[#12543C] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Evaluating...' : 'Apply'}</span>
            </button>

            {/* Methodology Explainer Trigger */}
            <button
              type="button"
              onClick={onOpenMethodology}
              className="p-1.5 text-[#777C76] hover:text-[#202521] hover:bg-[#F7F6F2] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E7E5DE]"
              title="Methodology, market timings & interval harmonization notes"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Bar: Perspective Pairing & Analytical Baseline Context */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[#777C76] border-t border-[#E7E5DE]/80 pt-2.5 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#202521]">Selected Perspective:</span>
            <span className="text-[#176B4D] font-mono font-semibold whitespace-nowrap">{selectedDate}</span>
            <ArrowRight className="w-3 h-3 text-[#777C76] shrink-0" />
            <span className="text-[#202521] font-medium whitespace-nowrap">{pairedLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] whitespace-nowrap">
            <span className="text-amber-800 font-medium">Analytical Baseline:</span>
            <span>
              {cutoffPreset === '11:00'
                ? '11:00 UTC is an internal desk review baseline (Nord Pool D-1 closes at 09:50 GMT).'
                : `Cutoff set to ${cutoffPreset} UTC.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

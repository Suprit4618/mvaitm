import React from 'react';
import { X, BookOpen, AlertCircle, ShieldCheck, Clock, Layers } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>WindSight Analytical Methodology & Market Context</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed font-sans">
          {/* Section 1 */}
          <div>
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4" />
              1. January 2026 Evaluation Scope & D-1 Procurement Convention
            </h4>
            <p>
              Under Great Britain wholesale day-ahead power market conventions (BETTA / BSC), procurement desks trade power on the day before physical delivery (<strong>Day-Ahead D-1</strong>) to cover anticipated customer load.
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-400">
              <li><strong>Primary Evaluation Window:</strong> Purchasing decisions made from <strong>1–31 January 2026</strong>, delivering power from <strong>2 January–1 February 2026</strong> across exactly <strong>744 delivery hours</strong> (1,488 settlement periods).</li>
              <li><strong>Boundary Validation Window:</strong> 1 January 2026 delivery (decided on 31 December 2025) is evaluated as an independent boundary check to prevent conflation with January decision-date metrics.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4" />
              2. Point-in-Time Selection & Operational Cutoff Presets
            </h4>
            <p>
              To eliminate future lookahead bias, the evaluation algorithm selects only forecasts whose publication timestamp satisfies:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-md font-mono text-[11px] text-cyan-300 border border-slate-800 my-1.5">
              selected_forecast = max(publishTime &le; decision_cutoff on D-1)
            </div>
            <p className="mt-1">
              <strong>Operational Presets (Analytical Assumptions):</strong>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-400">
              <li><strong>09:00 UTC:</strong> Pre-Auction Decision Point (informs bids prior to EPEX 09:20 & Nord Pool 09:50 auction closures).</li>
              <li><strong>11:00 UTC (Recommended Default):</strong> Post-Auction Position Review (the desk reviews auction clearance results against National Grid ESO's 09:30 UTC wind forecast run). <em>Note: 11:00 UTC is an analytical desk assumption, NOT a statutory auction gate closure.</em></li>
              <li><strong>14:00 UTC:</strong> Early Afternoon Continuous Rebalancing.</li>
              <li><strong>17:00 UTC:</strong> End-of-Day Continuous Position Freeze.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4" />
              3. Temporal Harmonization: Hourly vs. Half-Hourly Resolution
            </h4>
            <p>
              Elexon actuals (<code>FUELHH</code>) report half-hourly average power (MW), whereas National Grid ESO forecasts (<code>WINDFOR</code>) report hourly expected power (MW).
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-400">
              <li><strong>Hourly Aggregated View (Primary Benchmark):</strong> Aggregates the two half-hourly actuals to compare like-for-like 1-hour average power outturn: <code>Actual_hour = (SP_1 + SP_2) / 2</code>.</li>
              <li><strong>Half-Hourly Step-Down View (Operational View):</strong> Evaluates settlement periods 1–48 directly against the hourly forecast rate. <em>Limitation:</em> Assumes flat intra-hour output and artificially reflects intra-hour wind ramping variance.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div>
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4" />
              4. Disclaimer & Scope Limitations
            </h4>
            <p className="text-slate-400">
              WindSight is a historical forecast intelligence and risk auditing console. It evaluates national-level aggregated wind transmission outturn from Elexon BMRS. It is not an automated algorithmic execution system and does not constitute financial trading advice or guarantees of financial cost savings.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};

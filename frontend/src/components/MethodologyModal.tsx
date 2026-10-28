import { X, BookOpen, AlertCircle, ShieldCheck, Clock, Layers } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202521]/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E7E5DE] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5DE]">
          <div className="flex items-center gap-2.5 text-[#202521] font-semibold text-base">
            <div className="w-7 h-7 rounded-lg bg-[#176B4D]/10 text-[#176B4D] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>WindSight Analytical Methodology &amp; Market Context</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#777C76] hover:text-[#202521] p-1.5 rounded-lg hover:bg-[#F7F6F2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#202521] leading-relaxed font-sans">
          {/* Section 1: January Scope & D-1 Window */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#176B4D] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              1. January 2026 Evaluation Scope &amp; Day-Ahead (D-1) Convention
            </h4>
            <p className="text-[#777C76]">
              Under Great Britain wholesale power market conventions (BETTA / BSC), procurement desks trade power on the day before physical delivery (<strong>Day-Ahead D-1</strong>) to cover anticipated customer demand.
            </p>
            <div className="bg-[#F7F6F2] border border-[#E7E5DE] rounded-lg p-3 space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-[#202521] min-w-[140px]">&bull; Primary Evaluation:</span>
                <span className="text-[#777C76]">
                  Purchasing decisions made <strong>1–31 January 2026</strong> delivering power from <strong>2 January–1 February 2026</strong> across exactly <strong>744 delivery hours</strong> (1,488 settlement periods).
                </span>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-[#E7E5DE]">
                <span className="font-semibold text-[#202521] min-w-[140px]">&bull; Boundary Validation:</span>
                <span className="text-[#777C76]">
                  1 January 2026 delivery (decided on 31 December 2025) is evaluated independently to avoid conflating boundary days with January decision-date metrics.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Point-in-Time Selection */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#2B6CB0] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              2. Point-in-Time Forecast Selection &amp; Operational Cutoffs
            </h4>
            <p className="text-[#777C76]">
              To eliminate future lookahead bias, the evaluation algorithm selects strictly the most recent forecast publication satisfying:
            </p>
            <div className="bg-[#F7F6F2] p-2.5 rounded-lg font-mono text-[11px] text-[#202521] border border-[#E7E5DE]">
              selected_forecast = max(publishTime &le; decision_cutoff on D-1)
            </div>
            <p className="text-[#777C76] pt-1">
              <strong>Operational Presets (Analytical Assumptions):</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#777C76]">
              <li><strong>09:00 UTC:</strong> Pre-Auction Decision Point (informs order bids prior to EPEX 09:20 &amp; Nord Pool 09:50 auction closures).</li>
              <li><strong>11:00 UTC (Recommended Baseline):</strong> Post-Auction Position Review (informs midday continuous rebalancing). <em>Note: 11:00 UTC is an analytical desk review assumption, not an official auction deadline.</em></li>
              <li><strong>14:00 UTC:</strong> Early Afternoon Continuous Trading.</li>
              <li><strong>17:00 UTC:</strong> End-of-Day Position Close.</li>
            </ul>
          </div>

          {/* Section 3: Imbalance Cashout Positioning */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              3. Imbalance Cashout Mechanics for Electricity Buyers
            </h4>
            <p className="text-[#777C76]">
              Forecast errors alter the procurement volume secured day-ahead, generating financial exposure in the Elexon Balancing Mechanism:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1">
                <span className="font-semibold text-amber-900 text-xs flex items-center gap-1">
                  Over-forecast (Bias &gt; 0)
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Desk expects more wind and under-procures power day-ahead &rarr; <strong>SHORT deficit</strong> cashed out at the System Buy Price (SBP), which can spike sharply during system stress.
                </p>
              </div>
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-1">
                <span className="font-semibold text-blue-900 text-xs flex items-center gap-1">
                  Under-forecast (Bias &lt; 0)
                </span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Desk expects less wind and over-procures power day-ahead &rarr; <strong>LONG surplus</strong> cashed out at the System Sell Price (SSP), yielding reduced value for excess energy.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Temporal Harmonization */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#176B4D] flex items-center gap-2">
              <Layers className="w-4 h-4" />
              4. Temporal Harmonization: Hourly vs. Half-Hourly Resolution
            </h4>
            <p className="text-[#777C76]">
              Elexon actuals (<code>FUELHH</code>) report half-hourly average power (MW), while National Grid ESO forecasts (<code>WINDFOR</code>) report hourly expected power (MW).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#777C76]">
              <li><strong>Hourly Aggregation (Primary Benchmark):</strong> Combines adjacent settlement periods into 1-hour average power outturn: <code>Actual_hour = (SP_2k-1 + SP_2k) / 2</code> to ensure mathematical like-for-like comparison.</li>
              <li><strong>Half-Hourly Resolution (Trading View):</strong> Compares settlement periods 1–48 directly against the hourly forecast rate. <em>Limitation:</em> Assumes flat intra-hour generation.</li>
            </ul>
          </div>

          {/* Section 5: Disclaimer */}
          <div className="pt-2 border-t border-[#E7E5DE] text-[11px] text-[#777C76]">
            <strong>Institutional Disclaimer:</strong> WindSight is a historical forecast intelligence and risk audit platform. It evaluates national-level aggregated wind transmission outturn from Elexon BMRS. It does not execute automated market trades or constitute guaranteed financial trading advice.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E7E5DE] bg-[#F7F6F2] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#176B4D] hover:bg-[#12543C] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};

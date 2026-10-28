import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ProcurementContext: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const objectives = [
    {
      num: '01',
      title: 'Forecast at Cutoff',
      description: 'Point-in-time selection (publishTime ≤ cutoff) on D-1, strictly eliminating lookahead bias.'
    },
    {
      num: '02',
      title: 'Actual Generation',
      description: 'Verified Elexon FUELHH actuals harmonized to like-for-like 1-hour average power outturn.'
    },
    {
      num: '03',
      title: 'Error & Cashout Risk',
      description: 'MAE, RMSE, nMAE %, plus signed Bias informing Short (SBP) vs. Long (SSP) imbalance penalties.'
    },
    {
      num: '04',
      title: 'Diurnal Hourly Profile',
      description: 'Delivery residuals and 31-day 24h diurnal pattern across all 744 January 2026 hours.'
    },
    {
      num: '05',
      title: 'Cutoff Sensitivity',
      description: 'Side-by-side matrix quantifying forecast accuracy across 09:00, 11:00, 14:00, and 17:00 UTC.'
    }
  ];

  return (
    <div className="bg-white border border-[#E7E5DE] rounded-xl overflow-hidden shadow-2xs transition-all">
      {/* Compact Summary Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#F7F6F2]/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-[#176B4D]/10 text-[#176B4D] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-[#202521]">
            Procurement Intelligence Framework
          </span>
          <span className="text-[#E7E5DE] hidden sm:inline">&bull;</span>
          <span className="text-xs text-[#777C76] hidden sm:inline">
            5 / 5 Client Objectives Verified Across 744 Delivery Hours
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#176B4D]">
            {isExpanded ? 'Hide Framework' : 'View Framework'}
          </span>
          <div className="text-[#777C76]">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {/* Expandable Editorial 5-Column Grid */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[#E7E5DE]/80 bg-[#F7F6F2]/30">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            {objectives.map((item) => (
              <div
                key={item.num}
                className="bg-white border border-[#E7E5DE] rounded-lg p-3 space-y-1 relative shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#176B4D] bg-[#176B4D]/10 px-1.5 py-0.2 rounded">
                    {item.num}
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-[#176B4D]" />
                </div>
                <div className="text-xs font-semibold text-[#202521] pt-0.5">
                  {item.title}
                </div>
                <p className="text-[11px] text-[#777C76] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

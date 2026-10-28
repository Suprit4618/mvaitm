import { Wind, RefreshCw, AlertCircle } from 'lucide-react';
import type { HealthResponse } from '../types/api';

interface HeaderProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  onSync: () => void;
  syncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  healthLoading,
  onSync,
  syncing
}) => {
  return (
    <header className="bg-white border-b border-[#E7E5DE] px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Brand & Purpose */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#176B4D]/10 border border-[#176B4D]/20 flex items-center justify-center text-[#176B4D] shrink-0">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold tracking-tight text-[#202521]">
                WindSight
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#176B4D]/10 text-[#176B4D] border border-[#176B4D]/20">
                Forecast Intelligence
              </span>
              <span className="text-[11px] font-medium text-[#777C76] hidden md:inline">
                Historical Audit Console
              </span>
            </div>
            <p className="text-[11px] text-[#777C76] mt-0.5 font-normal">
              UK Wholesale Electricity Procurement Analysis &bull; Elexon BMRS Verified
            </p>
          </div>
        </div>

        {/* Status Indicators & Sync Action */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Subtle Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F7F6F2] border border-[#E7E5DE] text-[#202521]">
            {healthLoading ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[#777C76]">Connecting...</span>
              </>
            ) : health?.status === 'ok' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#176B4D]" />
                <span className="font-medium text-[#202521]">System Live</span>
                <span className="text-[#E7E5DE]">&bull;</span>
                <span className="text-[#777C76] font-mono text-[11px]">
                  {health.database.actual_days_count} Days Cached
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-rose-700 font-medium">Disconnected</span>
              </>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F6F2] text-[#202521] border border-[#E7E5DE] transition-colors disabled:opacity-50 cursor-pointer font-medium shadow-2xs"
            title="Synchronize or refresh database directly from live Elexon API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#176B4D]' : 'text-[#777C76]'}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Elexon'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

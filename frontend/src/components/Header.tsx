import React from 'react';
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
    <header className="bg-white border-b border-[#E7E5DE] px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Brand & Market Context */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#176B4D]/10 flex items-center justify-center text-[#176B4D] shrink-0">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#202521]">
                WindSight
              </span>
              <span className="text-xs text-[#777C76] font-medium hidden sm:inline">
                / Wholesale Day-Ahead Forecast Intelligence
              </span>
            </div>
            <p className="text-[11px] text-[#777C76] mt-0.5 sm:hidden">
              Wholesale Day-Ahead Forecast Intelligence
            </p>
          </div>
        </div>

        {/* Data Provenance & Actions */}
        <div className="flex items-center gap-4 text-xs">
          {/* Real Market Data Attribution (No AI Slop Badges) */}
          <div className="text-[11px] text-[#777C76] hidden md:flex items-center gap-1.5">
            <span>Elexon BMRS Verified</span>
            <span>&bull;</span>
            <span>National Grid ESO WINDFOR</span>
          </div>

          {health?.status !== 'ok' && !healthLoading && (
            <div className="flex items-center gap-1 text-rose-600 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Offline</span>
            </div>
          )}

          {/* Sync Action */}
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F6F2] hover:bg-[#EAE8E1] text-[#202521] border border-[#E7E5DE] transition-colors disabled:opacity-50 cursor-pointer font-medium text-xs"
            title="Refresh Lakehouse from Elexon BMRS API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#176B4D]' : 'text-[#777C76]'}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Elexon'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

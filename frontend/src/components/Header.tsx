import React from 'react';
import { Wind, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Purpose */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 m-0">
                WindSight
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                Forecast Intelligence
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Historical Audit Console
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              UK Wholesale Day-Ahead Electricity Procurement Analysis — Elexon BMRS Verified
            </p>
          </div>
        </div>

        {/* Status Indicators & Sync Action */}
        <div className="flex items-center gap-3 text-xs">
          {/* API Health Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800">
            {healthLoading ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-slate-400">Checking API...</span>
              </>
            ) : health?.status === 'ok' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 font-medium">Backend Connected</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{health.database.actual_days_count} days cached</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300 font-medium">API Disconnected</span>
              </>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Synchronize or refresh database directly from live Elexon API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Elexon'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

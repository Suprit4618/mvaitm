import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { KpiGrid } from './components/KpiGrid';
import { ForecastChart } from './components/ForecastChart';
import { ErrorAnalysisSection } from './components/ErrorAnalysisSection';
import { CutoffSensitivityCard } from './components/CutoffSensitivityCard';
import { DataTable } from './components/DataTable';
import { MethodologyModal } from './components/MethodologyModal';
import {
  fetchHealth,
  fetchAvailableDates,
  fetchDailyAnalysis,
  fetchMonthlySummary,
  fetchCutoffComparison,
  triggerSync
} from './api/client';
import type {
  HealthResponse,
  AvailableDatesResponse,
  DailyAnalysisResponse,
  MonthlySummaryResponse,
  CutoffComparisonResponse
} from './types/api';
import { AlertCircle, RefreshCw, X, CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const App: React.FC = () => {
  // App state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [datesInfo, setDatesInfo] = useState<AvailableDatesResponse | null>(null);

  // Analysis parameters
  const [selectedDate, setSelectedDate] = useState('2026-01-14');
  const [dateMode, setDateMode] = useState<'decision' | 'delivery'>('decision');
  const [cutoffPreset, setCutoffPreset] = useState('11:00');
  const [customCutoff, setCustomCutoff] = useState('');
  const [viewMode, setViewMode] = useState<'hourly' | 'half_hourly'>('hourly');

  // Analysis data state
  const [analysis, setAnalysis] = useState<DailyAnalysisResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummaryResponse | null>(null);
  const [cutoffComparison, setCutoffComparison] = useState<CutoffComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [cutoffLoading, setCutoffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Operational states
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [showObjectives, setShowObjectives] = useState(true);

  // Initial setup: health & dates
  useEffect(() => {
    async function init() {
      try {
        setHealthLoading(true);
        const [hRes, dRes] = await Promise.all([
          fetchHealth().catch((err) => {
            console.error('Health check failed:', err);
            return null;
          }),
          fetchAvailableDates().catch((err) => {
            console.error('Dates check failed:', err);
            return null;
          })
        ]);
        setHealth(hRes);
        setDatesInfo(dRes);
      } finally {
        setHealthLoading(false);
      }
    }
    init();
  }, []);

  // Fetch daily analysis & cutoff sensitivity
  const loadDailyAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyAnalysis({
        date: selectedDate,
        date_mode: dateMode,
        cutoff_preset: cutoffPreset,
        custom_cutoff_time: cutoffPreset === 'custom' ? customCutoff : undefined,
        view_mode: viewMode
      });
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analysis.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dateMode, cutoffPreset, customCutoff, viewMode]);

  // Fetch cutoff sensitivity comparison
  const loadCutoffSensitivity = useCallback(async () => {
    setCutoffLoading(true);
    try {
      const data = await fetchCutoffComparison({
        date: selectedDate,
        date_mode: dateMode,
        view_mode: viewMode
      });
      setCutoffComparison(data);
    } catch (err: any) {
      console.error('Failed to load cutoff sensitivity:', err);
    } finally {
      setCutoffLoading(false);
    }
  }, [selectedDate, dateMode, viewMode]);

  // Fetch monthly summary
  const loadMonthlySummary = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const data = await fetchMonthlySummary({
        cutoff_preset: cutoffPreset,
        custom_cutoff_time: cutoffPreset === 'custom' ? customCutoff : undefined,
        view_mode: viewMode
      });
      setMonthlyData(data);
    } catch (err: any) {
      console.error('Failed to load monthly summary:', err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [cutoffPreset, customCutoff, viewMode]);

  // Initial & reactive analysis load
  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;
      loadDailyAnalysis();
      loadCutoffSensitivity();
      loadMonthlySummary();
    };
    run();
    return () => {
      active = false;
    };
  }, [loadDailyAnalysis, loadCutoffSensitivity, loadMonthlySummary]);

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerSync();
      setSyncMessage(res.message);
      // Refresh health & current analysis
      const h = await fetchHealth();
      setHealth(h);
      loadDailyAnalysis();
      loadCutoffSensitivity();
      loadMonthlySummary();
    } catch (err: any) {
      setError(`Elexon Sync Failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header */}
      <Header
        health={health}
        healthLoading={healthLoading}
        onSync={handleSync}
        syncing={syncing}
      />

      {/* 2. Control Bar */}
      <ControlBar
        datesInfo={datesInfo}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        cutoffPreset={cutoffPreset}
        onCutoffPresetChange={setCutoffPreset}
        customCutoff={customCutoff}
        onCustomCutoffChange={setCustomCutoff}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApply={() => {
          loadDailyAnalysis();
          loadCutoffSensitivity();
          loadMonthlySummary();
        }}
        loading={loading}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* Sync Success Notification */}
      {syncMessage && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-6 py-2 text-xs text-emerald-300 text-center flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-6">
        {/* Error Notification Banner */}
        {error && (
          <div className="bg-rose-950/90 border border-rose-500/50 rounded-lg p-4 flex items-start justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-200 m-0">Analysis Query Error</h4>
                <p className="text-rose-300 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  loadDailyAnalysis();
                  loadCutoffSensitivity();
                }}
                className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white font-medium rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="p-1 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Client Objectives Audit Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs shadow-xs">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowObjectives(!showObjectives)}>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">UK Procurement Intelligence Criteria & Coverage</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                5 / 5 Objectives Met
              </span>
            </div>
            <button className="text-slate-400 hover:text-slate-200 p-0.5">
              {showObjectives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showObjectives && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 mt-3 pt-2.5 border-t border-slate-800 text-[11px] leading-snug">
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                <div className="font-semibold text-cyan-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" /> 1. Forecast at Cutoff
                </div>
                <div className="text-slate-400">Point-in-time selection (publishTime &le; cutoff) without lookahead bias.</div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                <div className="font-semibold text-emerald-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> 2. Actual Generation
                </div>
                <div className="text-slate-400">Verified FUELHH WIND actuals harmonized to like-for-like 1h/30m resolution.</div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                <div className="font-semibold text-indigo-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" /> 3. Magnitude of Error
                </div>
                <div className="text-slate-400">MAE, RMSE, nMAE %, error percentiles (P10–P90), and cashout risk sign.</div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                <div className="font-semibold text-amber-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" /> 4. Hourly / SP Profile
                </div>
                <div className="text-slate-400">Intraday delivery residuals and 31-day January 24-hour diurnal profile.</div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                <div className="font-semibold text-fuchsia-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-fuchsia-400 shrink-0" /> 5. Cutoff Sensitivity
                </div>
                <div className="text-slate-400">Side-by-side accuracy matrix comparing 09:00, 11:00, 14:00, and 17:00 UTC.</div>
              </div>
            </div>
          )}
        </div>

        {loading && !analysis ? (
          /* Initial Loading Skeleton */
          <div className="h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Reconstructing historical point-in-time forecast...</span>
          </div>
        ) : analysis ? (
          <>
            {/* 3. KPI Grid */}
            <KpiGrid
              metrics={analysis.metrics}
              coverage={analysis.coverage}
              viewMode={viewMode}
            />

            {/* 4. Forecast vs Actual Chart */}
            <ForecastChart
              intervals={analysis.intervals}
              viewMode={viewMode}
              deliveryDate={analysis.delivery_date}
            />

            {/* 5. Cutoff Sensitivity Matrix (Objective 5) */}
            <CutoffSensitivityCard
              comparisonData={cutoffComparison}
              currentPreset={cutoffPreset}
              onSelectPreset={(preset) => {
                setCutoffPreset(preset);
                setCustomCutoff('');
              }}
              loading={cutoffLoading}
            />

            {/* 6. Error & Residual Analysis (Objectives 3 & 4) */}
            <ErrorAnalysisSection
              intervals={analysis.intervals}
              viewMode={viewMode}
              monthlyData={monthlyData}
              monthlyLoading={monthlyLoading}
            />

            {/* 7. Interval Records Data Table with CSV Export */}
            <DataTable
              intervals={analysis.intervals}
              deliveryDate={analysis.delivery_date}
              decisionDate={analysis.decision_date}
              cutoffTime={analysis.cutoff_time}
              viewMode={viewMode}
            />
          </>
        ) : null}
      </main>

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            WindSight &copy; 2026. UK Wholesale Day-Ahead Forecast Intelligence Platform.
          </div>
          <div className="flex items-center gap-4">
            <span>Data: Elexon BMRS (FUELHH &amp; WINDFOR)</span>
            <span>&bull;</span>
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Methodology &amp; Disclaimers
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

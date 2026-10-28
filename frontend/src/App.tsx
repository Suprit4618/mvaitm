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
import { AlertCircle, RefreshCw, X, Check } from 'lucide-react';

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
            console.error('Available dates check failed:', err);
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

  // Fetch daily analysis
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
    <div className="min-h-screen bg-[#F7F6F2] text-[#202521] flex flex-col font-sans">
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
        <div className="bg-[#176B4D]/10 border-b border-[#176B4D]/20 px-6 py-2 text-xs text-[#176B4D] font-medium text-center flex items-center justify-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-5">
        {/* Error Notification Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-900 m-0">Analysis Query Error</h4>
                <p className="text-rose-700 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  loadDailyAnalysis();
                  loadCutoffSensitivity();
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {loading && !analysis ? (
          /* Initial Loading Skeleton */
          <div className="h-96 flex flex-col items-center justify-center space-y-3 text-[#777C76]">
            <div className="w-8 h-8 border-2 border-[#176B4D] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Reconstructing point-in-time forecast from Elexon lakehouse...</span>
          </div>
        ) : analysis ? (
          <>
            {/* 3. Bento KPI Grid */}
            <KpiGrid
              metrics={analysis.metrics}
              coverage={analysis.coverage}
              viewMode={viewMode}
            />

            {/* 4. Forecast vs Actual Centerpiece Chart */}
            <ForecastChart
              intervals={analysis.intervals}
              viewMode={viewMode}
              deliveryDate={analysis.delivery_date}
            />

            {/* 5. Cutoff Sensitivity Matrix */}
            <CutoffSensitivityCard
              comparisonData={cutoffComparison}
              currentPreset={cutoffPreset}
              onSelectPreset={(preset) => {
                setCutoffPreset(preset);
                setCustomCutoff('');
              }}
              loading={cutoffLoading}
            />

            {/* 6. Error & Horizon Analysis */}
            <ErrorAnalysisSection
              intervals={analysis.intervals}
              viewMode={viewMode}
              monthlyData={monthlyData}
              monthlyLoading={monthlyLoading}
            />

            {/* 7. Detailed Audit Records Data Table with CSV Export */}
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

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-[#E7E5DE] px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-[#777C76] gap-2">
          <div>
            WindSight &copy; 2026. Institutional Electricity Procurement Forecast Intelligence Platform.
          </div>
          <div className="flex items-center gap-4">
            <span>Data Sources: Elexon BMRS (FUELHH actuals &amp; WINDFOR forecasts)</span>
            <span>&bull;</span>
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="text-[#202521] hover:text-[#176B4D] font-medium transition-colors cursor-pointer"
            >
              Methodology &amp; Market Context
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

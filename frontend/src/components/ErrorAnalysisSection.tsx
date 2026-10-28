import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import type { IntervalEvaluation, MonthlySummaryResponse } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';
import { BarChart3, CalendarRange, Clock } from 'lucide-react';

interface ErrorAnalysisSectionProps {
  intervals: IntervalEvaluation[];
  viewMode: 'hourly' | 'half_hourly';
  monthlyData: MonthlySummaryResponse | null;
  monthlyLoading: boolean;
}

export const ErrorAnalysisSection: React.FC<ErrorAnalysisSectionProps> = ({
  intervals,
  viewMode,
  monthlyData,
  monthlyLoading
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'diurnal'>('daily');

  // Daily interval errors
  const dailyErrorData = intervals
    .filter((item) => item.error_mw !== null)
    .map((item) => ({
      label: viewMode === 'hourly' ? `${String(item.hour).padStart(2, '0')}:00` : `SP ${item.settlement_period}`,
      error: item.error_mw,
      absError: item.abs_error_mw,
      actual: item.actual_mw,
      forecast: item.forecast_mw
    }));

  // Monthly trend data
  const monthlyTrendData = monthlyData?.daily_trends.map((item) => ({
    label: item.decision_date.slice(5), // "01-14"
    deliveryDate: item.delivery_date,
    decisionDate: item.decision_date,
    mae: item.mae_mw,
    bias: item.bias_mw,
    rmse: item.rmse_mw,
    actual: item.mean_actual_mw
  })) || [];

  // Monthly diurnal profile (Hour 0–23)
  const diurnalData = monthlyData?.diurnal_profile.map((item) => ({
    label: item.period_label,
    mae: item.mae_mw,
    bias: item.mean_error_mw,
    rmse: item.rmse_mw,
    samples: item.sample_count
  })) || [];

  return (
    <div className="bg-white border border-[#E7E5DE] rounded-xl p-5 shadow-2xs">
      {/* Tab Switcher & Title */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3 border-b border-[#E7E5DE] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[#202521] flex items-center gap-2 m-0 tracking-tight">
            <BarChart3 className="w-4 h-4 text-[#176B4D]" />
            Forecast Error &amp; Volatility Profile
          </h3>
          <p className="text-xs text-[#777C76] mt-0.5">
            {activeTab === 'daily' && 'Intraday error residuals by delivery interval (Forecast - Actual)'}
            {activeTab === 'diurnal' && 'Average forecast accuracy by delivery hour across all 744 January 2026 hours (Objective 4)'}
            {activeTab === 'monthly' && 'Full January 2026 Monthly Trend across 31 decision days (744 hours)'}
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="inline-flex rounded-lg bg-[#F7F6F2] p-0.5 border border-[#E7E5DE] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white text-[#202521] font-semibold shadow-2xs'
                : 'text-[#777C76] hover:text-[#202521]'
            }`}
          >
            Selected Day Residuals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diurnal')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diurnal'
                ? 'bg-white text-[#202521] font-semibold shadow-2xs'
                : 'text-[#777C76] hover:text-[#202521]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#176B4D]" />
            Diurnal Profile (Hour 0–23)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monthly'
                ? 'bg-white text-[#202521] font-semibold shadow-2xs'
                : 'text-[#777C76] hover:text-[#202521]'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-[#777C76]" />
            January Horizon (31 Days)
          </button>
        </div>
      </div>

      {/* Tab 1: Daily Residuals */}
      {activeTab === 'daily' && (
        <div>
          <div className="flex items-center justify-between text-xs text-[#777C76] mb-3">
            <span>Residual MW by Period (Positive = Over-forecast / Negative = Under-forecast)</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-600 rounded-xs" />
                <span className="text-[#202521] font-medium">Over-forecast (Short Risk)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#2B6CB0] rounded-xs" />
                <span className="text-[#202521] font-medium">Under-forecast (Long Surplus)</span>
              </span>
            </div>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyErrorData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DE" vertical={false} />
                <XAxis dataKey="label" stroke="#777C76" fontSize={11} tickLine={false} interval={viewMode === 'hourly' ? 1 : 3} />
                <YAxis stroke="#777C76" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} unit=" MW" />
                <ReferenceLine y={0} stroke="#777C76" strokeWidth={1} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isOver = d.error > 0;
                      return (
                        <div className="bg-white border border-[#E7E5DE] p-3 rounded-lg shadow-md text-xs space-y-1 min-w-[180px]">
                          <div className="font-semibold text-[#202521] border-b border-[#E7E5DE] pb-1">
                            {d.label}
                          </div>
                          <div className="flex justify-between text-[#777C76]">
                            <span>Variance:</span>
                            <span className={`font-mono font-bold ${isOver ? 'text-amber-700' : 'text-[#2B6CB0]'}`}>
                              {formatSignedMW(d.error)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[#777C76]">
                            <span>Actual:</span>
                            <span className="font-mono text-[#202521]">{formatMW(d.actual)}</span>
                          </div>
                          <div className="flex justify-between text-[#777C76]">
                            <span>Forecast:</span>
                            <span className="font-mono text-[#202521]">{formatMW(d.forecast)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="error" radius={[3, 3, 0, 0]}>
                  {dailyErrorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.error !== null && entry.error > 0 ? '#C05621' : '#2B6CB0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: Diurnal Profile (Hour 0–23) */}
      {activeTab === 'diurnal' && (
        <div>
          {monthlyLoading ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-[#777C76] animate-pulse">
              Computing 31-day diurnal hourly profile across 744 hours...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-[#777C76] mb-3">
                <span>Average MAE (Bars) and Bias (Line) by Delivery Period across all 31 Days in January 2026</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#176B4D] rounded-xs" />
                    <span className="text-[#202521] font-medium">Average MAE (MW)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-600 rounded-full" />
                    <span className="text-[#202521] font-medium">Average Bias (MW)</span>
                  </span>
                </div>
              </div>

              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={diurnalData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DE" vertical={false} />
                    <XAxis dataKey="label" stroke="#777C76" fontSize={11} tickLine={false} interval={1} />
                    <YAxis stroke="#777C76" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} unit=" MW" />
                    <ReferenceLine y={0} stroke="#777C76" strokeWidth={1} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-[#E7E5DE] p-3 rounded-lg shadow-md text-xs space-y-1 min-w-[200px]">
                              <div className="font-semibold text-[#202521] border-b border-[#E7E5DE] pb-1">
                                Delivery Period: {d.label} UTC
                              </div>
                              <div className="flex justify-between text-[#176B4D]">
                                <span className="font-medium">Average MAE:</span>
                                <span className="font-mono font-bold">{formatMW(d.mae)}</span>
                              </div>
                              <div className="flex justify-between text-amber-700">
                                <span className="font-medium">Average Bias:</span>
                                <span className="font-mono font-bold">{formatSignedMW(d.bias)}</span>
                              </div>
                              <div className="flex justify-between text-[#777C76] pt-1 border-t border-[#E7E5DE] text-[10px]">
                                <span>Evaluated Samples:</span>
                                <span className="font-mono">{d.samples} delivery days</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="mae" fill="#176B4D" opacity={0.85} radius={[3, 3, 0, 0]} name="Average MAE (MW)" />
                    <Line type="monotone" dataKey="bias" stroke="#C05621" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#C05621', stroke: '#FFFFFF', strokeWidth: 2 }} name="Average Bias (MW)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Monthly Horizon (31 Days) */}
      {activeTab === 'monthly' && (
        <div>
          {monthlyLoading ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-[#777C76] animate-pulse">
              Loading 31-day January evaluation horizon...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-[#777C76] mb-3">
                <span>Daily MAE &amp; Bias across January 2026 Purchasing Decisions (Decision Dates 01-01 to 01-31)</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#176B4D] rounded-full" />
                    <span className="text-[#202521] font-medium">Daily MAE (MW)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-600 rounded-full" />
                    <span className="text-[#202521] font-medium">Daily Bias (MW)</span>
                  </span>
                </div>
              </div>

              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DE" vertical={false} />
                    <XAxis dataKey="label" stroke="#777C76" fontSize={11} tickLine={false} interval={2} />
                    <YAxis stroke="#777C76" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} unit=" MW" />
                    <ReferenceLine y={0} stroke="#777C76" strokeWidth={1} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-[#E7E5DE] p-3 rounded-lg shadow-md text-xs space-y-1 min-w-[210px]">
                              <div className="font-semibold text-[#202521] border-b border-[#E7E5DE] pb-1">
                                Decision: 2026-{d.label} (Delivery: {d.deliveryDate})
                              </div>
                              <div className="flex justify-between text-[#176B4D]">
                                <span className="font-medium">MAE:</span>
                                <span className="font-mono font-bold">{formatMW(d.mae)}</span>
                              </div>
                              <div className="flex justify-between text-amber-700">
                                <span className="font-medium">Forecast Bias:</span>
                                <span className="font-mono font-bold">{formatSignedMW(d.bias)}</span>
                              </div>
                              <div className="flex justify-between text-[#777C76]">
                                <span>RMSE:</span>
                                <span className="font-mono text-[#202521]">{formatMW(d.rmse)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="monotone" dataKey="mae" stroke="#176B4D" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#176B4D', stroke: '#FFFFFF', strokeWidth: 2 }} name="MAE (MW)" />
                    <Line type="monotone" dataKey="bias" stroke="#C05621" strokeWidth={2} dot={false} strokeDasharray="3 3" activeDot={{ r: 4, fill: '#C05621', stroke: '#FFFFFF', strokeWidth: 2 }} name="Bias (MW)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

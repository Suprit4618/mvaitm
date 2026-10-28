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
  Line
} from 'recharts';
import type { IntervalEvaluation, MonthlySummaryResponse } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';
import { BarChart3, CalendarRange } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
      {/* Tab Switcher & Title */}
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2 border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 m-0">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Forecast Error & Volatility Profile
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === 'daily'
              ? 'Intraday error residuals by delivery interval (Forecast - Actual)'
              : 'Full January 2026 Monthly Trend across 31 decision days (744 hours)'}
          </p>
        </div>

        <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'daily' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Selected Day Residuals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'monthly' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            January Horizon (31 Days)
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'daily' ? (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Residual MW by Period (Positive = Over-forecast / Negative = Under-forecast)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Over-forecast (+)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Under-forecast (-)
              </span>
            </div>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyErrorData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval={viewMode === 'hourly' ? 1 : 3}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  unit=" MW"
                  tickFormatter={(v) => `${v}`}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Tooltip
                  formatter={(value: any) => [formatSignedMW(Number(value)), 'Error (Variance)']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                />
                <Bar dataKey="error" radius={[2, 2, 0, 0]}>
                  {dailyErrorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.error !== null && entry.error >= 0 ? '#f59e0b' : '#06b6d4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div>
          {monthlyLoading ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-slate-400">
              Loading January 2026 horizon metrics...
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Daily MAE & Bias across January 2026 Purchasing Decisions (Decision Dates 01-01 to 01-31)</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Daily MAE (MW)
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Daily Bias (MW)
                  </span>
                </div>
              </div>

              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      unit=" MW"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-md shadow-lg text-xs space-y-1">
                              <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                                Decision: {d.decisionDate} (Delivery: {d.deliveryDate})
                              </div>
                              <div className="text-cyan-400 flex justify-between gap-3">
                                <span>MAE:</span>
                                <span className="font-mono font-bold">{formatMW(d.mae)}</span>
                              </div>
                              <div className="text-amber-400 flex justify-between gap-3">
                                <span>Forecast Bias:</span>
                                <span className="font-mono font-bold">{formatSignedMW(d.bias)}</span>
                              </div>
                              <div className="text-slate-400 flex justify-between gap-3">
                                <span>RMSE:</span>
                                <span className="font-mono">{formatMW(d.rmse)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mae"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Daily MAE"
                    />
                    <Line
                      type="monotone"
                      dataKey="bias"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={{ r: 2 }}
                      name="Daily Bias"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

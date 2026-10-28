import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import type { IntervalEvaluation } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';

interface ForecastChartProps {
  intervals: IntervalEvaluation[];
  viewMode: 'hourly' | 'half_hourly';
  deliveryDate: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isOver = data.error !== null && data.error > 0;

    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-md shadow-lg text-xs font-sans space-y-1 z-50">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between gap-4">
          <span>{label} ({data.fullTime ? data.fullTime.slice(11, 16) : ''} UTC)</span>
          <span className="text-slate-400 font-mono">{data.deliveryDate}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-emerald-400">
          <span>Actual Outturn:</span>
          <span className="font-mono font-semibold">{formatMW(data.actual)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-cyan-400">
          <span>Point-in-Time Forecast:</span>
          <span className="font-mono font-semibold">{formatMW(data.forecast)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800">
          <span>Variance (Error):</span>
          <span className={`font-mono font-bold ${isOver ? 'text-amber-400' : 'text-cyan-300'}`}>
            {formatSignedMW(data.error)}
          </span>
        </div>

        {data.publishTime && (
          <div className="text-[10px] text-slate-500 pt-0.5">
            Published: {data.publishTime.slice(0, 16).replace('T', ' ')} UTC
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ForecastChart: React.FC<ForecastChartProps> = ({
  intervals,
  viewMode,
  deliveryDate
}) => {
  // Format chart data
  const chartData = intervals.map((item) => {
    const label = viewMode === 'hourly' 
      ? `${String(item.hour).padStart(2, '0')}:00`
      : `SP ${String(item.settlement_period).padStart(2, '0')}`;

    return {
      label,
      fullTime: item.start_time,
      deliveryDate,
      hour: item.hour,
      settlementPeriod: item.settlement_period,
      actual: item.actual_mw,
      forecast: item.forecast_mw,
      error: item.error_mw,
      absError: item.abs_error_mw,
      publishTime: item.publish_time
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 m-0">
            Generation Outturn vs. Point-in-Time Forecast
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'hourly'
              ? 'Hourly like-for-like comparison (Actuals aggregated to 1h average power)'
              : 'Half-Hourly Settlement Period resolution (SPs 1–48)'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-400 rounded-sm" />
            <span className="text-slate-300 font-medium">Actual Outturn (MW)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-cyan-400 rounded-sm border-dashed" />
            <span className="text-slate-300 font-medium">Point-in-Time Forecast (MW)</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
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
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Shaded Area for Visual Context */}
            <Area
              type="monotone"
              dataKey="actual"
              fill="#10b981"
              fillOpacity={0.06}
              stroke="none"
            />

            {/* Actual Outturn Line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#10b981' }}
              name="Actual Generation"
            />

            {/* Forecast Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5, fill: '#06b6d4' }}
              name="Point-in-Time Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

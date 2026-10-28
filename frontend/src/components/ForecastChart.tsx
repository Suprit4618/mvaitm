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
      <div className="bg-white border border-[#E7E5DE] p-3.5 rounded-lg shadow-md text-xs font-sans space-y-1.5 z-50 min-w-[220px]">
        <div className="font-semibold text-[#202521] border-b border-[#E7E5DE] pb-1.5 flex justify-between gap-4">
          <span>{label} ({data.fullTime ? data.fullTime.slice(11, 16) : ''} UTC)</span>
          <span className="text-[#777C76] font-mono font-normal">{data.deliveryDate}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-[#176B4D]">
          <span className="font-medium">Actual Outturn:</span>
          <span className="font-mono font-semibold">{formatMW(data.actual)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-[#2B6CB0]">
          <span className="font-medium">Point-in-Time Forecast:</span>
          <span className="font-mono font-semibold">{formatMW(data.forecast)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-[#202521] pt-1.5 border-t border-[#E7E5DE]">
          <span className="font-medium">Variance (Error):</span>
          <span className={`font-mono font-bold ${isOver ? 'text-amber-700' : 'text-[#2B6CB0]'}`}>
            {formatSignedMW(data.error)}
          </span>
        </div>

        {data.publishTime && (
          <div className="text-[10px] text-[#777C76] pt-1 font-mono">
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
    <div className="bg-white border border-[#E7E5DE] rounded-xl p-5 shadow-2xs">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#202521] m-0 tracking-tight">
            Generation Outturn vs. Point-in-Time Forecast
          </h2>
          <p className="text-xs text-[#777C76] mt-0.5">
            {viewMode === 'hourly'
              ? 'Hourly like-for-like comparison (Elexon FUELHH actuals averaged to 1h power)'
              : 'Half-Hourly Settlement Period resolution (SPs 1–48)'}
          </p>
        </div>

        {/* Refined Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#176B4D] rounded-full" />
            <span className="text-[#202521] font-medium">Actual Outturn (MW)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#2B6CB0] border-b-2 border-dashed border-[#2B6CB0]" />
            <span className="text-[#202521] font-medium">Point-in-Time Forecast (MW)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[340px]">
        <ResponsiveContainer width="100%" height={340} minWidth={0} debounce={0}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 15, bottom: 20 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#176B4D" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#176B4D" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DE" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#777C76"
              fontSize={11}
              tickLine={false}
              interval={viewMode === 'hourly' ? 1 : 3}
            />
            <YAxis
              stroke="#777C76"
              fontSize={11}
              tickLine={false}
              width={42}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Shaded Area for Actual Outturn */}
            <Area
              type="monotone"
              dataKey="actual"
              fill="url(#actualGradient)"
              stroke="transparent"
              isAnimationActive={false}
            />

            {/* Actual Outturn Line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Outturn"
              stroke="#176B4D"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#176B4D', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Point-in-Time Forecast Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              name="Point-in-Time Forecast"
              stroke="#2B6CB0"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 5, fill: '#2B6CB0', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

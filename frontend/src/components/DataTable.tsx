import React, { useState } from 'react';
import { Download, Table, Search } from 'lucide-react';
import type { IntervalEvaluation } from '../types/api';
import { formatMW, formatSignedMW, exportAnalysisToCSV } from '../utils/formatters';

interface DataTableProps {
  intervals: IntervalEvaluation[];
  deliveryDate: string;
  decisionDate: string;
  cutoffTime: string;
  viewMode: 'hourly' | 'half_hourly';
}

export const DataTable: React.FC<DataTableProps> = ({
  intervals,
  deliveryDate,
  decisionDate,
  cutoffTime,
  viewMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = intervals.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.interval_id.toLowerCase().includes(term) ||
      item.start_time.toLowerCase().includes(term) ||
      (item.sp_span && item.sp_span.toLowerCase().includes(term))
    );
  });

  const handleExport = () => {
    exportAnalysisToCSV(intervals, deliveryDate, decisionDate, cutoffTime, viewMode);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm space-y-3">
      {/* Header & Export Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200 m-0">
            Interval Audit & Outturn Records ({filtered.length} intervals)
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search interval / time..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-48"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Download complete analysis as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-800 rounded-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 text-[11px] font-medium tracking-wider uppercase">
            <tr>
              <th className="py-2.5 px-3">Interval</th>
              <th className="py-2.5 px-3">Time (UTC)</th>
              <th className="py-2.5 px-3">Span</th>
              <th className="py-2.5 px-3 text-right">Actual Outturn</th>
              <th className="py-2.5 px-3 text-right">Point-in-Time Forecast</th>
              <th className="py-2.5 px-3 text-right">Variance (Error)</th>
              <th className="py-2.5 px-3">Forecast Publish Time (UTC)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filtered.map((item) => {
              const isOver = item.error_mw !== null && item.error_mw > 0;
              const isUnder = item.error_mw !== null && item.error_mw < 0;

              return (
                <tr key={item.interval_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-200">{item.interval_id}</td>
                  <td className="py-2 px-3 text-slate-400">{item.start_time.slice(11, 16)}</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">
                    {item.sp_span || (item.settlement_period ? `SP ${item.settlement_period}` : `Hour ${item.hour}`)}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                    {formatMW(item.actual_mw)}
                  </td>
                  <td className="py-2 px-3 text-right text-cyan-400 font-semibold">
                    {formatMW(item.forecast_mw)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold ${
                      isOver ? 'text-amber-400' : isUnder ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    {formatSignedMW(item.error_mw)}
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    {item.publish_time ? item.publish_time.slice(0, 16).replace('T', ' ') : '—'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] rounded-full uppercase tracking-wider font-sans font-semibold ${
                        item.status === 'complete'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

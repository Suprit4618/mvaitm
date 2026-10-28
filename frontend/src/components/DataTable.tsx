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
    <div className="bg-white border border-[#E7E5DE] rounded-xl p-5 shadow-2xs space-y-3.5">
      {/* Header & Export Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E5DE] pb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[#176B4D]" />
          <h3 className="text-base font-semibold text-[#202521] m-0 tracking-tight">
            Interval Audit &amp; Outturn Records
          </h3>
          <span className="text-xs text-[#777C76] font-mono">
            ({filtered.length} intervals)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#777C76] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search interval / time..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#F7F6F2] border border-[#E7E5DE] text-[#202521] text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D] w-48"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F6F2] text-[#202521] border border-[#E7E5DE] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Download complete analysis as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#176B4D]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[#E7E5DE] rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F7F6F2] text-[#777C76] sticky top-0 border-b border-[#E7E5DE] text-[11px] font-semibold tracking-wider uppercase z-10">
            <tr>
              <th className="py-2.5 px-3.5">Interval</th>
              <th className="py-2.5 px-3.5">Time (UTC)</th>
              <th className="py-2.5 px-3.5">Span</th>
              <th className="py-2.5 px-3.5 text-right">Actual Outturn</th>
              <th className="py-2.5 px-3.5 text-right">Point-in-Time Forecast</th>
              <th className="py-2.5 px-3.5 text-right">Variance (Error)</th>
              <th className="py-2.5 px-3.5">Publish Timestamp (UTC)</th>
              <th className="py-2.5 px-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5DE]/80 font-mono text-[#202521]">
            {filtered.map((item) => {
              const isOver = item.error_mw !== null && item.error_mw > 0;
              const isUnder = item.error_mw !== null && item.error_mw < 0;

              return (
                <tr key={item.interval_id} className="hover:bg-[#F7F6F2]/50 transition-colors">
                  <td className="py-2 px-3.5 font-semibold text-[#202521]">{item.interval_id}</td>
                  <td className="py-2 px-3.5 text-[#777C76]">{item.start_time.slice(11, 16)}</td>
                  <td className="py-2 px-3.5 text-[#777C76] font-sans">
                    {item.sp_span || (item.settlement_period ? `SP ${item.settlement_period}` : `Hour ${item.hour}`)}
                  </td>
                  <td className="py-2 px-3.5 text-right text-[#176B4D] font-semibold">
                    {formatMW(item.actual_mw)}
                  </td>
                  <td className="py-2 px-3.5 text-right text-[#2B6CB0] font-semibold">
                    {formatMW(item.forecast_mw)}
                  </td>
                  <td className="py-2 px-3.5 text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        isOver
                          ? 'text-amber-800 bg-amber-50 border border-amber-200'
                          : isUnder
                          ? 'text-blue-800 bg-blue-50 border border-blue-200'
                          : 'text-[#777C76]'
                      }`}
                    >
                      {formatSignedMW(item.error_mw)}
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-[#777C76] text-[11px]">
                    {item.publish_time ? item.publish_time.slice(0, 16).replace('T', ' ') : '—'}
                  </td>
                  <td className="py-2 px-3.5 text-center font-sans text-[11px]">
                    {item.status === 'complete' ? (
                      <span className="text-[#777C76]">Delivered</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {item.status}
                      </span>
                    )}
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

/**
 * Formatting and CSV Export Utilities
 */

import type { IntervalEvaluation } from '../types/api';

export function formatMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Math.round(val).toLocaleString()} MW`;
}

export function formatMWh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Math.round(val).toLocaleString()} MWh`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val.toFixed(1)}%`;
}

export function formatSignedMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${Math.round(val).toLocaleString()} MW`;
}

/**
 * Generates properly escaped CSV content for the intervals dataset.
 */
export function generateCSVContent(
  intervals: IntervalEvaluation[],
  deliveryDate: string,
  decisionDate: string,
  cutoffTime: string,
  viewMode: string
): string {
  const headers = [
    'Interval ID',
    'Start Time (UTC)',
    'Settlement Period / Hour',
    'Actual Outturn (MW)',
    'Forecast Generation (MW)',
    'Forecast Publish Time (UTC)',
    'Error (Forecast - Actual) (MW)',
    'Absolute Error (MW)',
    'Status'
  ];

  const escapeCSV = (field: string | number | null | undefined): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = intervals.map((item) => [
    escapeCSV(item.interval_id),
    escapeCSV(item.start_time),
    escapeCSV(item.sp_span || (item.settlement_period ? `SP ${item.settlement_period}` : `Hour ${item.hour}`)),
    escapeCSV(item.actual_mw),
    escapeCSV(item.forecast_mw),
    escapeCSV(item.publish_time),
    escapeCSV(item.error_mw),
    escapeCSV(item.abs_error_mw),
    escapeCSV(item.status)
  ]);

  return [
    `# WindSight UK Wind Forecast Intelligence Export`,
    `# Delivery Date: ${deliveryDate} (Decision Date: ${decisionDate})`,
    `# Decision Cutoff: ${cutoffTime} UTC | Mode: ${viewMode}`,
    `# Source: Elexon BMRS Insights API`,
    headers.join(','),
    ...rows.map((r) => r.join(','))
  ].join('\r\n');
}

/**
 * Generates and triggers download of an escaped CSV file of the current interval analysis.
 */
export function exportAnalysisToCSV(
  intervals: IntervalEvaluation[],
  deliveryDate: string,
  decisionDate: string,
  cutoffTime: string,
  viewMode: string
): void {
  const csvContent = generateCSVContent(intervals, deliveryDate, decisionDate, cutoffTime, viewMode);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedCutoff = cutoffTime.replace(':', '');
  link.setAttribute('href', url);
  link.setAttribute('download', `windsight_${deliveryDate}_cutoff${sanitizedCutoff}UTC_${viewMode}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

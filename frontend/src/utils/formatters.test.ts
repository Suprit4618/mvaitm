import { describe, it, expect } from 'vitest';
import {
  formatMW,
  formatMWh,
  formatPercent,
  formatSignedMW,
  generateCSVContent
} from './formatters';
import type { IntervalEvaluation } from '../types/api';

describe('formatters', () => {
  it('formatMW formats correctly and handles edge cases', () => {
    expect(formatMW(14250.4)).toBe('14,250 MW');
    expect(formatMW(0)).toBe('0 MW');
    expect(formatMW(null)).toBe('—');
    expect(formatMW(undefined)).toBe('—');
    expect(formatMW(NaN)).toBe('—');
  });

  it('formatMWh formats numbers into MWh', () => {
    expect(formatMWh(342000.8)).toBe('342,001 MWh');
    expect(formatMWh(null)).toBe('—');
  });

  it('formatPercent formats single decimal percentages', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(100)).toBe('100.0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formatSignedMW prepends + for positive values and - for negative values', () => {
    expect(formatSignedMW(420.2)).toBe('+420 MW');
    expect(formatSignedMW(-315.6)).toBe('-316 MW');
    expect(formatSignedMW(0)).toBe('0 MW');
    expect(formatSignedMW(null)).toBe('—');
  });

  it('generateCSVContent escapes special characters and outputs headers and metadata', () => {
    const mockIntervals: IntervalEvaluation[] = [
      {
        interval_id: '2026-01-15_H00',
        start_time: '2026-01-15T00:00:00Z',
        hour: 0,
        settlement_period: undefined,
        sp_span: 'SP 1-2',
        actual_mw: 14500.25,
        forecast_mw: 15100.5,
        error_mw: 600.25,
        abs_error_mw: 600.25,
        publish_time: '2026-01-14T09:30:00Z',
        status: 'evaluated'
      },
      {
        interval_id: '2026-01-15_H01,special"name',
        start_time: '2026-01-15T01:00:00Z',
        hour: 1,
        settlement_period: undefined,
        sp_span: 'SP 3-4',
        actual_mw: 13200,
        forecast_mw: 12900,
        error_mw: -300,
        abs_error_mw: 300,
        publish_time: '2026-01-14T09:30:00Z',
        status: 'evaluated'
      }
    ];

    const csv = generateCSVContent(mockIntervals, '2026-01-15', '2026-01-14', '11:00', 'hourly');

    expect(csv).toContain('# WindSight UK Wind Forecast Intelligence Export');
    expect(csv).toContain('# Delivery Date: 2026-01-15 (Decision Date: 2026-01-14)');
    expect(csv).toContain('Interval ID,Start Time (UTC),Settlement Period / Hour');
    expect(csv).toContain('2026-01-15_H00,2026-01-15T00:00:00Z,SP 1-2,14500.25,15100.5');
    // Check escaping of commas and quotes in interval_id
    expect(csv).toContain('"2026-01-15_H01,special""name"');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDailyAnalysis, fetchHealth } from './client';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchHealth returns status payload on success', async () => {
    const mockHealth = {
      status: 'ok',
      service: 'WindSight Backend API',
      database: {
        actuals_count: 1488,
        forecasts_count: 19000,
        actual_days_count: 31,
        evaluation_window_ready: true
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth
    });

    const data = await fetchHealth();
    expect(data.status).toBe('ok');
    expect(data.database.actual_days_count).toBe(31);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/health');
  });

  it('fetchDailyAnalysis serializes query parameters accurately', async () => {
    const mockAnalysis = {
      mode: 'decision',
      selected_date: '2026-01-14',
      decision_date: '2026-01-14',
      delivery_date: '2026-01-15',
      cutoff_time: '11:00',
      view_mode: 'hourly',
      metrics: { mae_mw: 1110.25 },
      intervals: []
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis
    });

    const res = await fetchDailyAnalysis({
      date_mode: 'decision',
      date: '2026-01-14',
      cutoff_preset: '11:00',
      view_mode: 'hourly'
    });

    expect(res.delivery_date).toBe('2026-01-15');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/analysis?date=2026-01-14&date_mode=decision&cutoff_preset=11%3A00&view_mode=hourly'
    );
  });

  it('throws descriptive error on 400 Bad Request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        detail: 'Selected date 2026-02-15 is outside allowed window'
      })
    });

    await expect(
      fetchDailyAnalysis({ date_mode: 'decision', date: '2026-02-15' })
    ).rejects.toThrow('Selected date 2026-02-15 is outside allowed window');
  });
});

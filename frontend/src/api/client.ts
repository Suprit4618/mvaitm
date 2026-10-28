/**
 * Centralized Typed API Client for WindSight
 * Connects to the FastAPI backend using typed contracts and explicit error handling.
 */

import type {
  HealthResponse,
  AvailableDatesResponse,
  DailyAnalysisResponse,
  MonthlySummaryResponse,
  CutoffComparisonResponse
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // Ignore JSON parse failure on non-JSON error bodies
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  return handleResponse<HealthResponse>(res);
}

export async function fetchAvailableDates(): Promise<AvailableDatesResponse> {
  const res = await fetch(`${API_BASE}/api/dates`);
  return handleResponse<AvailableDatesResponse>(res);
}

export interface DailyAnalysisParams {
  date: string;
  date_mode: 'decision' | 'delivery';
  cutoff_preset?: string;
  custom_cutoff_time?: string;
  view_mode?: 'hourly' | 'half_hourly';
}

export async function fetchDailyAnalysis(params: DailyAnalysisParams): Promise<DailyAnalysisResponse> {
  const query = new URLSearchParams({
    date: params.date,
    date_mode: params.date_mode,
    cutoff_preset: params.cutoff_preset || '11:00',
    view_mode: params.view_mode || 'hourly'
  });

  if (params.custom_cutoff_time) {
    query.set('custom_cutoff_time', params.custom_cutoff_time);
  }

  const res = await fetch(`${API_BASE}/api/analysis?${query.toString()}`);
  return handleResponse<DailyAnalysisResponse>(res);
}

export interface MonthlySummaryParams {
  cutoff_preset?: string;
  custom_cutoff_time?: string;
  view_mode?: 'hourly' | 'half_hourly';
}

export async function fetchMonthlySummary(params: MonthlySummaryParams): Promise<MonthlySummaryResponse> {
  const query = new URLSearchParams({
    cutoff_preset: params.cutoff_preset || '11:00',
    view_mode: params.view_mode || 'hourly'
  });

  if (params.custom_cutoff_time) {
    query.set('custom_cutoff_time', params.custom_cutoff_time);
  }

  const res = await fetch(`${API_BASE}/api/monthly-summary?${query.toString()}`);
  return handleResponse<MonthlySummaryResponse>(res);
}

export async function triggerSync(startDate = '2025-12-31', endDate = '2026-02-01'): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate, end_date: endDate })
  });
  return handleResponse<{ status: string; message: string }>(res);
}

export interface CutoffComparisonParams {
  date: string;
  date_mode: 'decision' | 'delivery';
  view_mode?: 'hourly' | 'half_hourly';
}

export async function fetchCutoffComparison(params: CutoffComparisonParams): Promise<CutoffComparisonResponse> {
  const query = new URLSearchParams({
    date: params.date,
    date_mode: params.date_mode,
    view_mode: params.view_mode || 'hourly'
  });
  const res = await fetch(`${API_BASE}/api/cutoff-comparison?${query.toString()}`);
  return handleResponse<CutoffComparisonResponse>(res);
}

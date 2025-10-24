import type { DashboardMetrics } from './constants';

type RawDashboardMetrics = {
  total_attempts: number | string | null;
  correct_attempts: number | string | null;
  flagged_count: number | string | null;
  weekly_points: number | string | null;
  all_time_points: number | string | null;
};

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const ZERO_METRICS: DashboardMetrics = {
  total_attempts: 0,
  correct_attempts: 0,
  flagged_count: 0,
  weekly_points: 0,
  all_time_points: 0,
};

export function normalizeDashboardMetrics(row?: RawDashboardMetrics | null): DashboardMetrics {
  if (!row) {
    return {
      ...ZERO_METRICS,
    };
  }

  return {
    total_attempts: toNumber(row.total_attempts),
    correct_attempts: toNumber(row.correct_attempts),
    flagged_count: toNumber(row.flagged_count),
    weekly_points: toNumber(row.weekly_points),
    all_time_points: toNumber(row.all_time_points),
  };
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const { supabase } = await import('./supabaseClient');
  const { data, error } = await supabase.rpc('dashboard_metrics');
  if (error) throw error;
  const first = Array.isArray(data) ? (data[0] as RawDashboardMetrics | null | undefined) : null;
  return normalizeDashboardMetrics(first ?? null);
}

export const EMPTY_DASHBOARD_METRICS: DashboardMetrics = { ...ZERO_METRICS };

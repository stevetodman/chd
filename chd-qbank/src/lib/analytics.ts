import { supabase } from "./supabaseClient";
import type { HeatmapAggregateRow, ItemStats, ReliabilitySnapshot } from "./constants";

/**
 * Fetch public psychometrics for item performance.
 * Supabase guards the underlying view so sensitive fields remain hidden until n >= 30.
 *
 * @returns Aggregated item statistics ready for analytics dashboards.
 */
export async function fetchItemStats(): Promise<ItemStats[]> {
  const { data, error } = await supabase.from("item_stats_public").select("*");
  if (error) throw error;
  return data as ItemStats[];
}

/**
 * Retrieve the admin-only practice heatmap aggregates from Supabase RPC.
 *
 * @returns Heatmap rows containing per-day practice activity metrics.
 */
export async function fetchAdminHeatmap(): Promise<HeatmapAggregateRow[]> {
  const { data, error } = await supabase.rpc("analytics_heatmap_admin");
  if (error) throw error;
  return (data ?? []) as HeatmapAggregateRow[];
}

/**
 * Fetch the most recent reliability snapshot summarizing bank calibration.
 *
 * @returns Latest reliability stats or null when none exist.
 */
export async function fetchReliabilitySnapshot(): Promise<ReliabilitySnapshot | null> {
  const { data, error } = await supabase.rpc("analytics_reliability_snapshot");
  if (error) throw error;
  const rows = (data ?? []) as ReliabilitySnapshot[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Trigger recomputation of reliability metrics via the Supabase RPC hook.
 */
export async function refreshReliabilityMetrics(): Promise<void> {
  const { error } = await supabase.rpc("analytics_refresh_reliability");
  if (error) throw error;
}

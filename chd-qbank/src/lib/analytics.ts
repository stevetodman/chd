import { supabase } from "./supabaseClient";
import type { HeatmapAggregateRow, ItemStats, ReliabilitySnapshot } from "./constants";

// Fetch public psychometrics; Supabase view hides sensitive fields until n >= 30.
export async function fetchItemStats(): Promise<ItemStats[]> {
  const { data, error } = await supabase.from("item_stats_public").select("*");
  if (error) throw error;
  return data as ItemStats[];
}

export async function fetchAdminHeatmap(): Promise<HeatmapAggregateRow[]> {
  const { data, error } = await supabase.rpc("analytics_heatmap_admin");
  if (error) throw error;
  return (data ?? []) as HeatmapAggregateRow[];
}

export async function fetchReliabilitySnapshot(): Promise<ReliabilitySnapshot | null> {
  const { data, error } = await supabase.rpc("analytics_reliability_snapshot");
  if (error) throw error;
  const rows = (data ?? []) as ReliabilitySnapshot[];
  return rows.length > 0 ? rows[0] : null;
}

export async function refreshReliabilityMetrics(): Promise<void> {
  const { error } = await supabase.rpc("analytics_refresh_reliability");
  if (error) throw error;
}

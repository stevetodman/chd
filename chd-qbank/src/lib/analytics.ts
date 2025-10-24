import { supabase } from "./supabaseClient";
import type { CohortSummaryRow, HeatmapAggregateRow, ItemStats } from "./constants";

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

export async function fetchAdminCohortSummary(): Promise<CohortSummaryRow[]> {
  const { data, error } = await supabase.rpc("analytics_export_cohort");
  if (error) throw error;
  return (data ?? []) as CohortSummaryRow[];
}

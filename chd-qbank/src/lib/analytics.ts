import { supabase } from "./supabaseClient";
import type { HeatmapAggregateRow, ItemStats } from "./constants";

type HeatmapAdminRpcResponse = {
  status: number;
  rows?: HeatmapAggregateRow[];
  error?: string;
  duration_ms?: number;
};

// Fetch public psychometrics; Supabase view hides sensitive fields until n >= 30.
export async function fetchItemStats(): Promise<ItemStats[]> {
  const { data, error } = await supabase.from("item_stats_public").select("*");
  if (error) throw error;
  return data as ItemStats[];
}

export async function fetchAdminHeatmap(): Promise<HeatmapAggregateRow[]> {
  const { data, error } = await supabase.rpc<HeatmapAdminRpcResponse>(
    "analytics_heatmap_admin"
  );
  if (error) throw error;
  if (!data || data.status !== 200 || !Array.isArray(data.rows)) {
    return [];
  }
  return data.rows;
}

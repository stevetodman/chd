import { supabase } from "./supabaseClient";
import type { HeatRow, ItemStats } from "./constants";

// Fetch public psychometrics; Supabase view hides sensitive fields until n >= 30.
export async function fetchItemStats(): Promise<ItemStats[]> {
  const { data, error } = await supabase.rpc("item_stats_public");
  if (error) throw error;
  return data as ItemStats[];
}

export async function fetchHeatmap(): Promise<HeatRow[]> {
  const { data, error } = await supabase.rpc("heatmap_by_lesion_topic");
  if (error) throw error;
  return (data ?? []) as HeatRow[];
}

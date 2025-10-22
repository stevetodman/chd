import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "./telemetry";

export type FlaggedResponse = {
  id: string;
  questions: { stem_md: string; lead_in: string | null } | null;
};

export async function fetchFlaggedResponses(client: SupabaseClient, userId: string): Promise<FlaggedResponse[]> {
  const { data, error } = await client
    .from("responses")
    .select("*, questions(stem_md, lead_in)")
    .eq("user_id", userId)
    .eq("flagged", true)
    .order("created_at", { ascending: false });

  if (error) {
    logError(error, { scope: "review.fetch", userId });
    throw error;
  }

  return (data ?? []) as FlaggedResponse[];
}

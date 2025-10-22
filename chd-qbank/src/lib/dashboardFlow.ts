import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "./telemetry";

export type AliasStatus = {
  aliasNeeded: boolean;
  alias: string | null;
};

export async function fetchAliasStatus(client: SupabaseClient, userId: string): Promise<AliasStatus> {
  const { data, error } = await client
    .from("app_users")
    .select("alias, alias_locked")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logError(error, { scope: "dashboard.alias", userId });
    return { aliasNeeded: false, alias: null };
  }

  const alias = data?.alias ?? null;
  const aliasNeeded = !alias || alias.trim().length === 0;
  return { aliasNeeded, alias };
}

export type FeaturedQuestion = { id: string; lead_in: string | null };

export async function fetchFeaturedQuestions(
  client: SupabaseClient,
  limit = 5,
  random: () => number = Math.random
): Promise<FeaturedQuestion[]> {
  const { data, error } = await client
    .from("questions")
    .select("id, lead_in")
    .eq("status", "published")
    .limit(limit);

  if (error) {
    logError(error, { scope: "dashboard.featured" });
    throw error;
  }

  const rows = (data ?? []) as FeaturedQuestion[];
  return rows.slice().sort(() => random() - 0.5);
}

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPracticeQuestions, QUESTION_SELECT } from "../lib/practiceFlow";
import { fetchAliasStatus, fetchFeaturedQuestions } from "../lib/dashboardFlow";
import { fetchFlaggedResponses } from "../lib/reviewFlow";
import { supabaseMock, setTableConfig, getTableConfig } from "./test-utils/supabaseMock";

type MockDatabase = { public: Record<string, unknown> };

describe("supabase contracts", () => {
  const client = supabaseMock as unknown as SupabaseClient<MockDatabase>;

  it("queries published practice questions with column projections", async () => {
    setTableConfig("questions", {
      rangeResult: { data: [], error: null, count: 0 }
    });

    await fetchPracticeQuestions(client, 0, 10);

    const questionsConfig = getTableConfig("questions");
    expect(questionsConfig.lastSelectArgs?.[0]).toBe(QUESTION_SELECT);
    expect(questionsConfig.lastSelectArgs?.[1]).toEqual({ count: "exact" });
    expect(questionsConfig.eqCalls).toContainEqual(["status", "published"]);
  });

  it("requests alias fields for the active user", async () => {
    setTableConfig("app_users", {
      maybeSingleResult: { data: { alias: "Demo", alias_locked: false }, error: null }
    });

    await fetchAliasStatus(client, "user-1");
    const config = getTableConfig("app_users");
    expect(config.lastSelectArgs?.[0]).toBe("alias, alias_locked");
    expect(config.eqCalls).toContainEqual(["id", "user-1"]);
  });

  it("fetches featured question metadata", async () => {
    setTableConfig("questions", {
      limitResult: { data: [], error: null }
    });

    await fetchFeaturedQuestions(client, 5);
    const config = getTableConfig("questions");
    expect(config.lastSelectArgs?.[0]).toBe("id, lead_in");
    expect(config.eqCalls).toContainEqual(["status", "published"]);
  });

  it("loads flagged responses with joined questions", async () => {
    setTableConfig("responses", {
      orderResult: { data: [], error: null }
    });

    await fetchFlaggedResponses(client, "user-9");
    const config = getTableConfig("responses");
    expect(config.lastSelectArgs?.[0]).toBe("*, questions(stem_md, lead_in)");
    expect(config.eqCalls).toContainEqual(["user_id", "user-9"]);
    expect(config.eqCalls).toContainEqual(["flagged", true]);
  });
});

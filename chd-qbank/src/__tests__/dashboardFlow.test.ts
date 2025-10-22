import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAliasStatus, fetchFeaturedQuestions } from "../lib/dashboardFlow";
import { supabaseMock, setTableConfig } from "./test-utils/supabaseMock";
import { logError } from "../lib/telemetry";

type MockDatabase = { public: Record<string, unknown> };

describe("dashboard flow", () => {
  const client = supabaseMock as unknown as SupabaseClient<MockDatabase>;

  it("determines when an alias is needed", async () => {
    setTableConfig("app_users", {
      maybeSingleResult: { data: { alias: "", alias_locked: false }, error: null }
    });

    const status = await fetchAliasStatus(client, "user-1");
    expect(status.aliasNeeded).toBe(true);

    setTableConfig("app_users", {
      maybeSingleResult: { data: { alias: "Learner", alias_locked: true }, error: null }
    });

    const nextStatus = await fetchAliasStatus(client, "user-1");
    expect(nextStatus.aliasNeeded).toBe(false);
  });

  it("logs and suppresses alias errors", async () => {
    setTableConfig("app_users", {
      maybeSingleResult: { data: null, error: { message: "oops" } }
    });

    const status = await fetchAliasStatus(client, "user-2");
    expect(status.aliasNeeded).toBe(false);
    expect(logError).toHaveBeenCalled();
  });

  it("returns randomized featured questions", async () => {
    setTableConfig("questions", {
      limitResult: {
        data: [
          { id: "a", lead_in: "A" },
          { id: "b", lead_in: "B" }
        ],
        error: null
      }
    });

    const questions = await fetchFeaturedQuestions(client, 5, () => 0.6);
    expect(questions).toHaveLength(2);
  });

  it("logs featured query errors", async () => {
    setTableConfig("questions", {
      limitResult: { data: null, error: { message: "nope" } }
    });

    await expect(fetchFeaturedQuestions(client)).rejects.toThrowError("nope");
    expect(logError).toHaveBeenCalled();
  });
});

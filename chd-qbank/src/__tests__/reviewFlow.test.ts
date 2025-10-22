import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchFlaggedResponses } from "../lib/reviewFlow";
import { supabaseMock, setTableConfig } from "./test-utils/supabaseMock";
import { logError } from "../lib/telemetry";

type MockDatabase = { public: Record<string, unknown> };

describe("review flow", () => {
  const client = supabaseMock as unknown as SupabaseClient<MockDatabase>;

  it("returns flagged responses", async () => {
    setTableConfig("responses", {
      orderResult: {
        data: [
          { id: "r1", questions: { stem_md: "Stem", lead_in: "Lead" } }
        ],
        error: null
      }
    });

    const rows = await fetchFlaggedResponses(client, "user-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].questions?.lead_in).toBe("Lead");
  });

  it("logs and rethrows errors", async () => {
    setTableConfig("responses", {
      orderResult: { data: null, error: { message: "fail" } }
    });

    await expect(fetchFlaggedResponses(client, "user-2")).rejects.toThrowError("fail");
    expect(logError).toHaveBeenCalled();
  });
});

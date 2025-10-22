import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPracticeQuestions, submitPracticeAnswer } from "../lib/practiceFlow";
import { supabaseMock, setTableConfig, getTableConfig } from "./test-utils/supabaseMock";
import { logError } from "../lib/telemetry";

type MockDatabase = { public: Record<string, unknown> };

describe("practice flow", () => {
  const client = supabaseMock as unknown as SupabaseClient<MockDatabase>;

  it("normalizes and shuffles questions", async () => {
    setTableConfig("questions", {
      rangeResult: {
        data: [
          {
            id: "q1",
            slug: "slug-1",
            stem_md: "Stem",
            lead_in: "Lead",
            explanation_brief_md: "Brief",
            explanation_deep_md: null,
            topic: null,
            subtopic: null,
            lesion: null,
            media_bundle: null,
            context_panels: null,
            choices: [
              { id: "c2", label: "B", text_md: "B", is_correct: false },
              { id: "c1", label: "A", text_md: "A", is_correct: true }
            ]
          }
        ],
        error: null,
        count: 1
      }
    });

    const { questions, count } = await fetchPracticeQuestions(client, 0, 10, () => 0.4);

    expect(count).toBe(1);
    expect(questions).toHaveLength(1);
    expect(questions[0].choices[0].label).toBe("A");
  });

  it("logs and rethrows fetch errors", async () => {
    setTableConfig("questions", {
      rangeResult: { data: null, error: { message: "boom" } }
    });

    await expect(fetchPracticeQuestions(client, 0, 10)).rejects.toThrowError(
      "boom"
    );
    expect(logError).toHaveBeenCalled();
  });

  it("submits answers and increments points for correct responses", async () => {
    setTableConfig("responses", {
      insertResult: { data: null, error: null }
    });
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

    await submitPracticeAnswer({
      client,
      userId: "user",
      questionId: "q1",
      choice: { id: "c1", label: "A", text_md: "A", is_correct: true },
      durationMs: 1200,
      flagged: false
    });

    const insertCalls = getTableConfig("responses").builder?.insert.mock.calls ?? [];
    expect(insertCalls.length).toBeGreaterThan(0);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("increment_points", { delta: 1 });
  });

  it("logs insert errors", async () => {
    setTableConfig("responses", {
      insertResult: { data: null, error: { message: "fail" } }
    });

    await expect(
      submitPracticeAnswer({
        client,
        userId: "user",
        questionId: "q1",
        choice: { id: "c1", label: "A", text_md: "A", is_correct: false },
        durationMs: 100,
        flagged: true
      })
    ).rejects.toThrowError("fail");
    expect(logError).toHaveBeenCalled();
  });
});

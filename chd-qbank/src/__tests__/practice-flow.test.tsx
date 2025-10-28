import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Practice from "../pages/Practice";
import { useSessionStore } from "../lib/auth";
import type { QuestionQueryRow } from "../lib/practice";
import { createMockSession } from "./test-helpers";
import { syntheticPracticeQuestions } from "./fixtures/syntheticData";
import { renderWithProviders } from "./renderWithProviders";

interface ResponseRecord {
  id: string;
  user_id: string;
  question_id: string;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
  flagged: boolean;
}

const questions: QuestionQueryRow[] = syntheticPracticeQuestions.slice(0, 2);

const responsesById = new Map<string, ResponseRecord>();
const responsesByUserQuestion = new Map<string, ResponseRecord>();
const insertPayloads: ResponseRecord[] = [];
const updatePayloads: ResponseRecord[] = [];
let responseCounter = 0;

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(async () => ({ data: null, error: null }))
}));

const mapRecord = (record: ResponseRecord) => ({
  id: record.id,
  flagged: record.flagged,
  choice_id: record.choice_id,
  is_correct: record.is_correct,
  ms_to_answer: record.ms_to_answer
});

const storeResponse = (record: ResponseRecord) => {
  responsesById.set(record.id, record);
  responsesByUserQuestion.set(`${record.user_id}:${record.question_id}`, record);
};

const nextId = () => {
  responseCounter += 1;
  return `response-${responseCounter}`;
};

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn()
    },
    rpc: rpcMock,
    from: vi.fn((table: string) => {
      if (table === "questions") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async (from: number) => ({
                  data: questions.slice(from),
                  error: null,
                  count: questions.length
                })
              })
            })
          })
        };
      }

      if (table === "responses") {
        return {
          select: () => {
            const filters: Partial<Record<"user_id" | "question_id", string>> = {};
            const execute = async () => {
              const rows = Array.from(responsesById.values()).filter((row) => {
                if (filters.user_id && row.user_id !== filters.user_id) return false;
                if (filters.question_id && row.question_id !== filters.question_id) return false;
                return true;
              });
              return { data: rows.map((row) => mapRecord(row)), error: null };
            };
            const chain = {
              eq: (column: string, value: string) => {
                filters[column as "user_id" | "question_id"] = value;
                return chain;
              },
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => {
                    const key = `${filters.user_id ?? ""}:${filters.question_id ?? ""}`;
                    const record = responsesByUserQuestion.get(key) ?? null;
                    return { data: record ? mapRecord(record) : null, error: null };
                  }
                })
              }),
              then: (onFulfilled?: (value: { data: ResponseRecord[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) =>
                execute().then(onFulfilled, onRejected),
              catch: (onRejected?: (reason: unknown) => unknown) => execute().catch(onRejected),
              finally: (onFinally?: () => void) => execute().finally(onFinally)
            };
            return chain;
          },
          update: (payload: Partial<ResponseRecord>) => ({
            eq: (_column: string, value: string) => ({
              select: () => ({
                maybeSingle: async () => {
                  const existing = responsesById.get(value);
                  if (!existing) {
                    return { data: null, error: new Error("Missing response") };
                  }
                  const updated: ResponseRecord = {
                    ...existing,
                    choice_id: payload.choice_id ?? existing.choice_id,
                    is_correct: payload.is_correct ?? existing.is_correct,
                    ms_to_answer: payload.ms_to_answer ?? existing.ms_to_answer,
                    flagged: payload.flagged ?? existing.flagged
                  };
                  storeResponse(updated);
                  updatePayloads.push(updated);
                  return { data: mapRecord(updated), error: null };
                }
              })
            })
          }),
          insert: (payload: Partial<ResponseRecord>) => {
            const base = Array.isArray(payload) ? payload[0] : payload;
            const record: ResponseRecord = {
              id: nextId(),
              user_id: base.user_id ?? "user-1",
              question_id: base.question_id ?? "",
              choice_id: base.choice_id ?? null,
              is_correct: base.is_correct ?? false,
              ms_to_answer: base.ms_to_answer ?? null,
              flagged: base.flagged ?? false
            };
            storeResponse(record);
            insertPayloads.push(record);
            return {
              select: () => ({
                single: async () => ({ data: mapRecord(record), error: null })
              })
            };
          }
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  }
}));

describe("practice flow", () => {
  beforeEach(() => {
    responsesById.clear();
    responsesByUserQuestion.clear();
    insertPayloads.length = 0;
    updatePayloads.length = 0;
    responseCounter = 0;
    rpcMock.mockClear();
    useSessionStore.setState({ session: createMockSession("user-1"), loading: false, initialized: true });
  });

  it("walks through a practice session, persisting progress and advancing", async () => {
    const user = userEvent.setup();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    renderWithProviders(<Practice />);

    await screen.findByText("What is the next best step in management?");

    await user.click(screen.getByRole("button", { name: /flag/i }));
    await waitFor(() => expect(insertPayloads).toHaveLength(1));
    expect(insertPayloads[0]).toMatchObject({
      flagged: true,
      question_id: "practice-q1",
      choice_id: null
    });

    await user.click(
      screen.getByRole("button", { name: /schedule pulmonary valve replacement/i })
    );
    await waitFor(() => expect(updatePayloads).toHaveLength(1));
    expect(updatePayloads[0]).toMatchObject({
      question_id: "practice-q1",
      choice_id: "choice-b",
      flagged: true,
      is_correct: true
    });
    expect(rpcMock).toHaveBeenCalledWith("increment_points", {
      source: "practice_response",
      source_id: "response-1"
    });

    const [firstNextButton, ...restNextButtons] = screen.getAllByRole("button", { name: /next question/i });
    const nextQuestionButton = restNextButtons.at(-1) ?? firstNextButton;

    await user.click(nextQuestionButton);
    await screen.findByText("Which intervention improves systemic oxygenation immediately?");

    randomSpy.mockRestore();
  });
});

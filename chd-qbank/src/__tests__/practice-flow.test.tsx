import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Practice from "../pages/Practice";
import { useSessionStore } from "../lib/auth";
import type { QuestionQueryRow } from "../lib/practice";
import { createMockSession } from "./test-helpers";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(async () => ({ data: null, error: null }))
}));

interface ResponseRecord {
  id: string;
  user_id: string;
  question_id: string;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
  flagged: boolean;
}

const questions: QuestionQueryRow[] = [
  {
    id: "q1",
    slug: "q1",
    stem_md: "**First** question stem",
    lead_in: "First question",
    explanation_brief_md: "Brief 1",
    explanation_deep_md: null,
    topic: null,
    subtopic: null,
    lesion: null,
    media_bundle: null,
    context_panels: null,
    choices: [
      { id: "c1", label: "A", text_md: "Answer one", is_correct: true },
      { id: "c2", label: "B", text_md: "Answer two", is_correct: false }
    ]
  },
  {
    id: "q2",
    slug: "q2",
    stem_md: "**Second** question stem",
    lead_in: "Second question",
    explanation_brief_md: "Brief 2",
    explanation_deep_md: null,
    topic: null,
    subtopic: null,
    lesion: null,
    media_bundle: null,
    context_panels: null,
    choices: [
      { id: "c3", label: "A", text_md: "Third answer", is_correct: false },
      { id: "c4", label: "B", text_md: "Fourth answer", is_correct: true }
    ]
  }
];

const responsesById = new Map<string, ResponseRecord>();
const responsesByUserQuestion = new Map<string, ResponseRecord>();
const insertPayloads: ResponseRecord[] = [];
const updatePayloads: ResponseRecord[] = [];
let responseCounter = 0;

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
              })
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

it.skip("walks through a practice session, persisting progress and advancing", async () => {
    const user = userEvent.setup();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    render(<Practice />);

    expect(await screen.findByText("First question")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /flag question/i }));
    await waitFor(() => expect(insertPayloads).toHaveLength(1));
    expect(insertPayloads[0]).toMatchObject({ flagged: true, question_id: "q1", choice_id: null });

    await user.click(screen.getByRole("button", { name: /answer one/i }));
    await waitFor(() => expect(updatePayloads).toHaveLength(1));
    expect(updatePayloads[0]).toMatchObject({ question_id: "q1", choice_id: "c1", flagged: true, is_correct: true });
    expect(rpcMock).toHaveBeenCalledWith("increment_points", { delta: 1 });

    await user.click(screen.getByRole("button", { name: /next question/i }));
    expect(await screen.findByText("Second question")).toBeInTheDocument();

    randomSpy.mockRestore();
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "../testing/render";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Practice from "../pages/practice";
import { useSessionStore } from "../lib/auth";
import type { QuestionQueryRow } from "../lib/practice";
import { createMockSession } from "./test-helpers";
import { syntheticPracticeQuestions } from "./fixtures/syntheticData";

interface ResponseRecord {
  id: string;
  user_id: string;
  question_id: string;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
  flagged: boolean;
}

interface IssueReportRecord {
  id: string;
  user_id: string;
  question_id: string;
  response_id: string | null;
  description: string;
}

type ResponseRowResult = {
  id: string;
  question_id: string;
  flagged: boolean;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
};

type ResponseSelectResult = { data: ResponseRowResult[]; error: Error | null };

interface ResponseSelectChain {
  eq(column: "user_id" | "question_id", value: string): ResponseSelectChain;
  order(): {
    limit(): {
      maybeSingle(): Promise<{ data: ResponseRowResult | null; error: Error | null }>;
    };
  };
  then(callback: (result: ResponseSelectResult) => void | Promise<void>): Promise<void>;
}

const questions: QuestionQueryRow[] = syntheticPracticeQuestions.slice(0, 2);

const responsesById = new Map<string, ResponseRecord>();
const responsesByUserQuestion = new Map<string, ResponseRecord>();
const insertPayloads: ResponseRecord[] = [];
const updatePayloads: ResponseRecord[] = [];
const issueReports: IssueReportRecord[] = [];
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

beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false)
  }));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

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
            const chain: ResponseSelectChain = {
              eq(column, value) {
                filters[column] = value;
                return chain;
              },
              order() {
                return {
                  limit() {
                    return {
                      maybeSingle: async () => {
                        const key = `${filters.user_id ?? ""}:${filters.question_id ?? ""}`;
                        const record = responsesByUserQuestion.get(key) ?? null;
                        return { data: record ? mapRecord(record) : null, error: null };
                      }
                    };
                  }
                };
              },
              async then(callback) {
                const matching = Array.from(responsesById.values()).filter((record) => {
                  if (filters.user_id && record.user_id !== filters.user_id) {
                    return false;
                  }
                  if (filters.question_id && record.question_id !== filters.question_id) {
                    return false;
                  }
                  return true;
                });
                const mapped: ResponseRowResult[] = matching.map((record) => ({
                  id: record.id,
                  question_id: record.question_id,
                  flagged: record.flagged,
                  choice_id: record.choice_id,
                  is_correct: record.is_correct,
                  ms_to_answer: record.ms_to_answer
                }));
                await callback({ data: mapped, error: null });
              }
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

      if (table === "question_issue_reports") {
        return {
          insert: (payload: Partial<IssueReportRecord>) => {
            const base = Array.isArray(payload) ? payload[0] : payload;
            const record: IssueReportRecord = {
              id: `report-${issueReports.length + 1}`,
              user_id: base.user_id ?? "",
              question_id: base.question_id ?? "",
              response_id: base.response_id ?? null,
              description: base.description ?? ""
            };
            issueReports.push(record);
            return {
              select: () => ({
                single: async () => ({ data: { id: record.id }, error: null })
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
    issueReports.length = 0;
    responseCounter = 0;
    rpcMock.mockClear();
    useSessionStore.setState({ session: createMockSession("user-1"), loading: false, initialized: true });
  });

  it("walks through a practice session, persisting progress and advancing", async () => {
    const user = userEvent.setup();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    render(
      <MemoryRouter>
        <Practice />
      </MemoryRouter>
    );

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

    const nextButtons = screen.getAllByRole("button", { name: /next question/i });
    await user.click(nextButtons[nextButtons.length - 1]);
    await screen.findByText("Which intervention improves systemic oxygenation immediately?");

    randomSpy.mockRestore();
  });

  it("lets a student report an issue with the current question", async () => {
    const user = userEvent.setup();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    render(
      <MemoryRouter>
        <Practice />
      </MemoryRouter>
    );

    await screen.findByText("What is the next best step in management?");

    await user.click(
      screen.getByRole("button", { name: /schedule pulmonary valve replacement/i })
    );
    await waitFor(() => expect(responsesById.size).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: /report issue/i }));

    const dialog = await screen.findByRole("dialog", { name: /report a problem/i });
    const textarea = within(dialog).getByLabelText(/what needs attention/i);

    await user.type(textarea, "Choice D is outdated per new guidelines.");
    await user.click(within(dialog).getByRole("button", { name: /send report/i }));

    await screen.findByText(/thanks for letting us know/i);
    await waitFor(() => expect(issueReports).toHaveLength(1));

    expect(issueReports[0]).toMatchObject({
      user_id: "user-1",
      question_id: "practice-q1",
      response_id: "response-1"
    });
    expect(issueReports[0].description).toMatch(/guidelines/i);

    randomSpy.mockRestore();
  });
});

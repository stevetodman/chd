import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Practice from "../../src/pages/Practice";
import { useSessionStore } from "../../src/lib/auth";
import type { HeatmapAggregateRow } from "../../src/lib/constants";
import type { QuestionQueryRow } from "../../src/lib/practice";
import { supabase } from "../../src/lib/supabaseClient";
import { createMockSession } from "../../src/__tests__/test-helpers";

type ResponseRow = {
  id: string;
  user_id: string;
  question_id: string;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
  flagged: boolean;
  created_at: string;
};

type AnswerEventRow = {
  id: string;
  response_id: string;
  user_id: string;
  question_id: string;
  is_correct: boolean;
  points: number;
  effective_at: string;
  created_at: string;
};

type SupabaseMockState = {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  questions: QuestionQueryRow[];
  responses: ResponseRow[];
  events: AnswerEventRow[];
  heatmapRows: HeatmapAggregateRow[];
  nextResponseId: number;
  nextEventId: number;
  timestamp: string;
  lastIncrementPayload: { source: string; source_id: string } | null;
};

const supabaseState = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  questions: [] as QuestionQueryRow[],
  responses: [] as ResponseRow[],
  events: [] as AnswerEventRow[],
  heatmapRows: [] as HeatmapAggregateRow[],
  nextResponseId: 1,
  nextEventId: 1,
  timestamp: "2024-07-08T12:00:00.000Z",
  lastIncrementPayload: null as { source: string; source_id: string } | null
})) as unknown as SupabaseMockState;

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => supabaseState.from(...args),
    rpc: (...args: unknown[]) => supabaseState.rpc(...args),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

const TEST_USER_ID = "user-practice-analytics";

const practiceQuestion: QuestionQueryRow = {
  id: "practice-question-analytics",
  slug: "practice-question-analytics",
  stem_md:
    "A 12-year-old with Tetralogy repair presents for routine follow-up. Which finding suggests residual obstruction?",
  lead_in: "What is the next best step in management?",
  explanation_brief_md: "Echocardiography assesses the RVOT gradient.",
  explanation_deep_md: null,
  topic: "Follow-up",
  subtopic: null,
  lesion: "Tetralogy of Fallot",
  media_bundle: null,
  context_panels: [],
  choices: [
    { id: "choice-a", label: "A", text_md: "Order a Holter monitor", is_correct: false },
    { id: "choice-b", label: "B", text_md: "Schedule transthoracic echocardiography", is_correct: true }
  ]
};

function mapResponseRecord(record: ResponseRow) {
  return {
    id: record.id,
    user_id: record.user_id,
    question_id: record.question_id,
    choice_id: record.choice_id,
    is_correct: record.is_correct,
    ms_to_answer: record.ms_to_answer,
    flagged: record.flagged,
    created_at: record.created_at
  };
}

function mapEventRecord(record: AnswerEventRow) {
  return { ...record };
}

function filterRecords<T extends Record<string, unknown>>(
  rows: T[],
  filters: Partial<Record<keyof T, unknown>>
): T[] {
  return rows.filter((row) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined) return true;
      return row[key as keyof T] === value;
    })
  );
}

function sortRecords<T extends Record<string, unknown>>(
  rows: T[],
  column: keyof T | null,
  ascending: boolean
): T[] {
  if (!column) return rows.slice();
  const copy = rows.slice();
  copy.sort((a, b) => {
    const aValue = a[column];
    const bValue = b[column];
    if (aValue === bValue) return 0;
    const direction = ascending ? 1 : -1;
    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * direction;
    }
    const aString = String(aValue ?? "");
    const bString = String(bValue ?? "");
    return aString.localeCompare(bString, undefined, { numeric: true }) * direction;
  });
  return copy;
}

function logAnswerEvent(state: SupabaseMockState, response: ResponseRow, op: "insert" | "update") {
  const event: AnswerEventRow = {
    id: `event-${state.nextEventId}`,
    response_id: response.id,
    user_id: response.user_id,
    question_id: response.question_id,
    is_correct: response.is_correct,
    points: response.is_correct ? 1 : 0,
    effective_at: op === "insert" ? response.created_at : state.timestamp,
    created_at: state.timestamp
  };
  state.nextEventId += 1;
  state.events.push(event);
}

function createQuestionsBuilder(state: SupabaseMockState) {
  const builder = {
    select: (_columns?: string, _options?: unknown) => builder,
    eq: (_column: string, _value: unknown) => builder,
    order: (_column: string, _options?: { ascending?: boolean }) => builder,
    range: async (from: number, to: number) => ({
      data: state.questions.slice(from, to + 1),
      error: null,
      count: state.questions.length
    })
  };
  return builder;
}

function createResponsesBuilder(state: SupabaseMockState) {
  return {
    select: (_columns?: string) => {
      const filters: Partial<ResponseRow> = {};
      let orderColumn: keyof ResponseRow | null = null;
      let ascending = true;
      let limitCount: number | null = null;
      const chain: any = {
        eq(column: string, value: unknown) {
          filters[column as keyof ResponseRow] = value as ResponseRow[keyof ResponseRow];
          return chain;
        },
        order(column: string, options?: { ascending?: boolean }) {
          orderColumn = column as keyof ResponseRow;
          ascending = options?.ascending ?? true;
          return chain;
        },
        limit(count: number) {
          limitCount = count;
          return chain;
        },
        maybeSingle: async () => {
          const filtered = filterRecords(state.responses, filters);
          const ordered = sortRecords(filtered, orderColumn, ascending);
          const [record] = typeof limitCount === "number" ? ordered.slice(0, limitCount) : ordered;
          return { data: record ? mapResponseRecord(record) : null, error: null };
        }
      };
      return chain;
    },
    insert: (payload: Partial<ResponseRow> | Partial<ResponseRow>[]) => {
      const base = Array.isArray(payload) ? payload[0] : payload;
      if (!base.user_id || !base.question_id) {
        throw new Error("Missing required fields for response insert");
      }
      const record: ResponseRow = {
        id: `response-${state.nextResponseId}`,
        user_id: String(base.user_id),
        question_id: String(base.question_id),
        choice_id: (base.choice_id ?? null) as string | null,
        is_correct: Boolean(base.is_correct),
        ms_to_answer: typeof base.ms_to_answer === "number" ? base.ms_to_answer : null,
        flagged: Boolean(base.flagged),
        created_at: state.timestamp
      };
      state.nextResponseId += 1;
      state.responses.push(record);
      logAnswerEvent(state, record, "insert");
      return {
        select: () => ({
          single: async () => ({ data: mapResponseRecord(record), error: null })
        })
      };
    },
    update: (payload: Partial<ResponseRow>) => ({
      eq: (_column: string, value: string) => ({
        select: () => ({
          maybeSingle: async () => {
            const record = state.responses.find((row) => row.id === value);
            if (!record) {
              return { data: null, error: new Error("Missing response") };
            }
            const previousCorrect = record.is_correct;
            if (payload.choice_id !== undefined) record.choice_id = payload.choice_id;
            if (payload.is_correct !== undefined) record.is_correct = Boolean(payload.is_correct);
            if (payload.ms_to_answer !== undefined) record.ms_to_answer = payload.ms_to_answer ?? null;
            if (payload.flagged !== undefined) record.flagged = Boolean(payload.flagged);
            if (payload.is_correct !== undefined && payload.is_correct !== previousCorrect) {
              logAnswerEvent(state, record, "update");
            }
            return { data: mapResponseRecord(record), error: null };
          }
        })
      })
    })
  };
}

function createAnswerEventsBuilder(state: SupabaseMockState) {
  return {
    select: (_columns?: string) => {
      const filters: Partial<AnswerEventRow> = {};
      let orderColumn: keyof AnswerEventRow | null = null;
      let ascending = true;
      let limitCount: number | null = null;
      const chain: any = {
        eq(column: string, value: unknown) {
          filters[column as keyof AnswerEventRow] = value as AnswerEventRow[keyof AnswerEventRow];
          return chain;
        },
        order(column: string, options?: { ascending?: boolean }) {
          orderColumn = column as keyof AnswerEventRow;
          ascending = options?.ascending ?? true;
          return chain;
        },
        limit(count: number) {
          limitCount = count;
          return chain;
        },
        maybeSingle: async () => {
          const filtered = filterRecords(state.events, filters);
          const ordered = sortRecords(filtered, orderColumn, ascending);
          const [record] = typeof limitCount === "number" ? ordered.slice(0, limitCount) : ordered;
          return { data: record ? mapEventRecord(record) : null, error: null };
        }
      };
      return chain;
    }
  };
}

function startOfWeek(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc.toISOString().slice(0, 10);
}

function computeHeatmap(state: SupabaseMockState): HeatmapAggregateRow[] {
  const aggregates = new Map<
    string,
    {
      question_id: string;
      lesion: string | null;
      topic: string | null;
      week_start: string;
      attempts: number;
      correct_attempts: number;
      totalMs: number;
      msCount: number;
    }
  >();

  for (const response of state.responses) {
    const question = state.questions.find((q) => q.id === response.question_id);
    if (!question) continue;
    const weekStart = startOfWeek(new Date(response.created_at));
    const key = `${response.question_id}__${weekStart}`;
    const existing = aggregates.get(key) ?? {
      question_id: response.question_id,
      lesion: question.lesion,
      topic: question.topic,
      week_start: weekStart,
      attempts: 0,
      correct_attempts: 0,
      totalMs: 0,
      msCount: 0
    };
    existing.attempts += 1;
    if (response.is_correct) existing.correct_attempts += 1;
    if (typeof response.ms_to_answer === "number") {
      existing.totalMs += response.ms_to_answer;
      existing.msCount += 1;
    }
    aggregates.set(key, existing);
  }

  return Array.from(aggregates.values())
    .map((entry) => ({
      question_id: entry.question_id,
      lesion: entry.lesion,
      topic: entry.topic,
      week_start: entry.week_start,
      attempts: entry.attempts,
      correct_attempts: entry.correct_attempts,
      incorrect_attempts: entry.attempts - entry.correct_attempts,
      correct_rate: entry.attempts > 0 ? entry.correct_attempts / entry.attempts : 0,
      avg_time_ms: entry.msCount > 0 ? entry.totalMs / entry.msCount : null
    }))
    .sort(
      (a, b) =>
        b.week_start.localeCompare(a.week_start) ||
        (a.lesion ?? "").localeCompare(b.lesion ?? "") ||
        (a.topic ?? "").localeCompare(b.topic ?? "") ||
        a.question_id.localeCompare(b.question_id)
    );
}

describe("practice response analytics capture", () => {
  beforeEach(() => {
    supabaseState.from.mockReset();
    supabaseState.rpc.mockReset();
    supabaseState.questions = [practiceQuestion];
    supabaseState.responses = [];
    supabaseState.events = [];
    supabaseState.heatmapRows = [];
    supabaseState.nextResponseId = 1;
    supabaseState.nextEventId = 1;
    supabaseState.timestamp = "2024-07-08T12:00:00.000Z";
    supabaseState.lastIncrementPayload = null;

    supabaseState.from.mockImplementation((table: string) => {
      if (table === "questions") return createQuestionsBuilder(supabaseState);
      if (table === "responses") return createResponsesBuilder(supabaseState);
      if (table === "answer_events") return createAnswerEventsBuilder(supabaseState);
      throw new Error(`Unexpected table: ${table}`);
    });

    supabaseState.rpc.mockImplementation(async (fn: string, args?: unknown) => {
      if (fn === "increment_points") {
        supabaseState.lastIncrementPayload = args as { source: string; source_id: string };
        return { data: null, error: null };
      }
      if (fn === "analytics_refresh_heatmap") {
        supabaseState.heatmapRows = computeHeatmap(supabaseState);
        return { data: null, error: null };
      }
      if (fn === "analytics_heatmap_admin") {
        return { data: supabaseState.heatmapRows.slice(), error: null };
      }
      throw new Error(`Unexpected RPC: ${fn}`);
    });

    useSessionStore.setState({ session: createMockSession(TEST_USER_ID), loading: false, initialized: true });
  });

  it("captures responses and refreshes analytics aggregates", async () => {
    const user = userEvent.setup();
    let now = 0;
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

    render(<Practice />);

    await screen.findByText(practiceQuestion.lead_in ?? "");

    const answerButton = await screen.findByRole("button", {
      name: /B\.\s*Schedule transthoracic echocardiography/i
    });

    now = 1500;
    await user.click(answerButton);

    await waitFor(() => {
      expect(supabaseState.lastIncrementPayload).not.toBeNull();
    });

    let savedResponse: ReturnType<typeof mapResponseRecord> | null = null;
    await waitFor(async () => {
      const { data } = await supabase
        .from("responses")
        .select("id, user_id, question_id, choice_id, is_correct, ms_to_answer, created_at")
        .eq("user_id", TEST_USER_ID)
        .eq("question_id", practiceQuestion.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      expect(data).not.toBeNull();
      savedResponse = data;
    });

    expect(savedResponse).toMatchObject({
      user_id: TEST_USER_ID,
      question_id: practiceQuestion.id,
      is_correct: true,
      ms_to_answer: 1500
    });

    let savedEvent: ReturnType<typeof mapEventRecord> | null = null;
    await waitFor(async () => {
      const { data } = await supabase
        .from("answer_events")
        .select("id, response_id, user_id, question_id, is_correct, points, effective_at")
        .eq("response_id", savedResponse?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      expect(data).not.toBeNull();
      savedEvent = data;
    });

    expect(savedEvent).toMatchObject({
      response_id: savedResponse?.id,
      user_id: TEST_USER_ID,
      question_id: practiceQuestion.id,
      is_correct: true,
      points: 1
    });

    const { data: initialHeatmap } = await supabase.rpc("analytics_heatmap_admin");
    expect(initialHeatmap).toEqual([]);

    await supabase.rpc("analytics_refresh_heatmap");

    const { data: refreshedHeatmap } = await supabase.rpc("analytics_heatmap_admin");
    expect(refreshedHeatmap).toContainEqual(
      expect.objectContaining({
        question_id: practiceQuestion.id,
        lesion: practiceQuestion.lesion,
        topic: practiceQuestion.topic,
        week_start: "2024-07-08",
        attempts: 1,
        correct_attempts: 1,
        incorrect_attempts: 0,
        correct_rate: 1,
        avg_time_ms: 1500
      })
    );

    nowSpy.mockRestore();
  });
});

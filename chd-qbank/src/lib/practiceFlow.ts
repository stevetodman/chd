import type { Choice, ContextPanel, Question } from "./constants";
import { logError } from "./telemetry";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionRow = Question & { choices: Choice[] };

export type QuestionQueryRow = {
  id: string;
  slug: string;
  stem_md: string;
  lead_in: string | null;
  explanation_brief_md: string;
  explanation_deep_md: string | null;
  topic: string | null;
  subtopic: string | null;
  lesion: string | null;
  media_bundle: Question["media_bundle"];
  context_panels: ContextPanel[] | null;
  choices: Choice[] | null;
};

export const QUESTION_SELECT =
  "id, slug, stem_md, lead_in, explanation_brief_md, explanation_deep_md, topic, subtopic, lesion, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id,label,text_md,is_correct)";

export function normalizeQuestions(rows: QuestionQueryRow[]): QuestionRow[] {
  return rows.map((item) => ({
    id: item.id,
    slug: item.slug,
    stem_md: item.stem_md,
    lead_in: item.lead_in,
    explanation_brief_md: item.explanation_brief_md,
    explanation_deep_md: item.explanation_deep_md,
    topic: item.topic,
    subtopic: item.subtopic,
    lesion: item.lesion,
    media_bundle: item.media_bundle ?? null,
    context_panels: item.context_panels ?? null,
    choices: (item.choices ?? []).slice().sort((a, b) => a.label.localeCompare(b.label))
  }));
}

export async function fetchPracticeQuestions(
  client: SupabaseClient,
  page: number,
  pageSize: number,
  random: () => number = Math.random
): Promise<{ questions: QuestionRow[]; count?: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await client
    .from("questions")
    .select(QUESTION_SELECT, { count: "exact" })
    .eq("status", "published")
    .range(from, to);

  if (error) {
    logError(error, { scope: "practice.fetch", page });
    throw error;
  }

  const normalized = normalizeQuestions(((data ?? []) as QuestionQueryRow[]) ?? []);
  const shuffled = normalized.slice().sort(() => random() - 0.5);
  return { questions: shuffled, count: typeof count === "number" ? count : undefined };
}

export type SubmitPracticeParams = {
  client: SupabaseClient;
  userId: string;
  questionId: string;
  choice: Choice;
  durationMs: number;
  flagged: boolean;
};

export async function submitPracticeAnswer({
  client,
  userId,
  questionId,
  choice,
  durationMs,
  flagged
}: SubmitPracticeParams) {
  const { error: insertError } = await client.from("responses").insert({
    user_id: userId,
    question_id: questionId,
    choice_id: choice.id,
    is_correct: choice.is_correct,
    ms_to_answer: durationMs,
    flagged
  });

  if (insertError) {
    logError(insertError, { scope: "practice.submit", questionId });
    throw insertError;
  }

  if (!choice.is_correct) {
    return;
  }

  const { error: rpcError } = await client.rpc("increment_points", { delta: 1 });
  if (rpcError) {
    logError(rpcError, { scope: "practice.points", questionId });
  }
}

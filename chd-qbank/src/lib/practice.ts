import type { Choice, ContextPanel, Question } from "./constants";

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

export const PRACTICE_PAGE_SIZE = 10;

export function normalizeQuestionRows(rows: QuestionQueryRow[]): QuestionRow[] {
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
    choices: (item.choices ?? [])
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label))
  }));
}

export function mergeQuestionPages(existing: QuestionRow[], incoming: QuestionRow[]): QuestionRow[] {
  if (existing.length === 0) {
    return incoming.slice();
  }

  const map = new Map(existing.map((question) => [question.id, question]));
  incoming.forEach((question) => {
    map.set(question.id, question);
  });
  return Array.from(map.values());
}

export function shuffleQuestions<T>(questions: T[], rng: () => number = Math.random): T[] {
  const copy = questions.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export function determineHasMore(
  totalCount: number | null | undefined,
  totalLoaded: number,
  lastPageLength: number,
  pageSize = PRACTICE_PAGE_SIZE
): boolean {
  if (typeof totalCount === "number") {
    return totalLoaded < totalCount;
  }
  return lastPageLength === pageSize;
}

export function shouldLoadNextPage(index: number, totalQuestions: number, hasMore: boolean): boolean {
  if (!hasMore) return false;
  if (totalQuestions === 0) return false;
  return index >= totalQuestions - 2;
}

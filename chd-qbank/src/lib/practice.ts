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

/**
 * Normalize raw question rows returned from Supabase into the shape used in the app.
 *
 * @param rows - Records retrieved from the practice view including nullable arrays.
 * @returns Questions with sorted choices and null-safe fields.
 */
export function normalizeQuestionRows(rows: Array<QuestionQueryRow | Record<string, unknown>>): QuestionRow[] {
  return rows.map((raw) => {
    const item = raw as QuestionQueryRow;

    return {
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
    } satisfies QuestionRow;
  });
}

/**
 * Merge two pages of questions, ensuring the latest copy for each id is retained.
 *
 * @param existing - Questions that have already been loaded locally.
 * @param incoming - Questions from the newly fetched page.
 * @returns Combined list deduplicated by question id.
 */
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

/**
 * Shuffle questions using the Fisher-Yates algorithm.
 *
 * @param questions - Array that should be randomized.
 * @param rng - Optional deterministic RNG used for testing.
 * @returns New array with elements reordered.
 */
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

/**
 * Determine whether there are more questions available to fetch for infinite scrolling.
 *
 * @param totalCount - Total number of questions reported by Supabase, when available.
 * @param totalLoaded - Count of questions currently in memory.
 * @param lastPageLength - Number of questions returned in the most recent page.
 * @param pageSize - Expected number of questions per page.
 * @returns True when another page should be requested.
 */
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

/**
 * Decide whether the UI should begin loading the next page based on scroll position.
 *
 * @param index - Index of the question currently being rendered.
 * @param totalQuestions - Total questions loaded in the list component.
 * @param hasMore - Whether additional pages exist.
 * @returns True when the caller should request the subsequent page.
 */
export function shouldLoadNextPage(index: number, totalQuestions: number, hasMore: boolean): boolean {
  if (!hasMore) return false;
  if (totalQuestions === 0) return false;
  return index >= totalQuestions - 2;
}

import { describe, expect, it } from "vitest";
import {
  determineHasMore,
  mergeQuestionPages,
  normalizeQuestionRows,
  PRACTICE_PAGE_SIZE,
  shuffleQuestions,
  shouldLoadNextPage,
  type QuestionQueryRow
} from "../lib/practice";

const sampleRow = (overrides: Partial<QuestionQueryRow> = {}): QuestionQueryRow => ({
  id: "id-1",
  slug: "slug-1",
  stem_md: "stem",
  lead_in: null,
  explanation_brief_md: "brief",
  explanation_deep_md: null,
  topic: null,
  subtopic: null,
  lesion: null,
  media_bundle: null,
  context_panels: [],
  choices: null,
  ...overrides
});

describe("practice helpers", () => {
  it("normalizes question rows and sorts choices", () => {
    const normalized = normalizeQuestionRows([
      sampleRow({
        id: "q1",
        choices: [
          { id: "c2", label: "B", text_md: "b", is_correct: false },
          { id: "c1", label: "A", text_md: "a", is_correct: true }
        ]
      })
    ]);

    expect(normalized).toEqual([
      expect.objectContaining({
        id: "q1",
        choices: [
          { id: "c1", label: "A", text_md: "a", is_correct: true },
          { id: "c2", label: "B", text_md: "b", is_correct: false }
        ]
      })
    ]);
  });

  it("merges question pages without duplicating entries", () => {
    const firstPage = normalizeQuestionRows([
      sampleRow({ id: "q1" }),
      sampleRow({ id: "q2" })
    ]);
    const secondPage = normalizeQuestionRows([
      sampleRow({ id: "q2", explanation_brief_md: "updated" }),
      sampleRow({ id: "q3" })
    ]);

    const merged = mergeQuestionPages(firstPage, secondPage);
    expect(merged).toHaveLength(3);
    expect(merged.find((question) => question.id === "q2")?.explanation_brief_md).toBe("updated");
  });

  it("shuffles questions using the provided random number generator", () => {
    const questions = normalizeQuestionRows([
      sampleRow({ id: "q1" }),
      sampleRow({ id: "q2" }),
      sampleRow({ id: "q3" })
    ]);
    let seed = 0;
    const rng = () => {
      // Simple deterministic generator cycling through fractions.
      const value = [0.8, 0.2, 0.4][seed % 3];
      seed += 1;
      return value;
    };

    const shuffled = shuffleQuestions(questions, rng);
    expect(shuffled.map((question) => question.id)).toEqual(["q2", "q1", "q3"]);
  });

  it("determines if there are more questions when total count is provided", () => {
    const hasMore = determineHasMore(20, 10, PRACTICE_PAGE_SIZE);
    const noMore = determineHasMore(10, 10, PRACTICE_PAGE_SIZE);

    expect(hasMore).toBe(true);
    expect(noMore).toBe(false);
  });

  it("falls back to page length when count is unavailable", () => {
    expect(determineHasMore(null, PRACTICE_PAGE_SIZE, PRACTICE_PAGE_SIZE)).toBe(true);
    expect(determineHasMore(undefined, PRACTICE_PAGE_SIZE + 1, PRACTICE_PAGE_SIZE - 1)).toBe(false);
  });

  it("identifies when the next page should be loaded", () => {
    expect(shouldLoadNextPage(0, 0, true)).toBe(false);
    expect(shouldLoadNextPage(2, 5, false)).toBe(false);
    expect(shouldLoadNextPage(3, 5, true)).toBe(true);
  });
});

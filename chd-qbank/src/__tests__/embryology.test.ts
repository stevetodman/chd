import { describe, expect, it } from "vitest";
import { createEmbryologyQuestionSet, embryologyDeckSize } from "../lib/games/embryology";

describe("embryology game helpers", () => {
  it("builds a question for every deck card with unique options", () => {
    const questions = createEmbryologyQuestionSet();

    expect(questions).toHaveLength(embryologyDeckSize);

    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      const correct = question.options.filter((option) => option.isCorrect);
      expect(correct).toHaveLength(1);
      expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
    }
  });
});

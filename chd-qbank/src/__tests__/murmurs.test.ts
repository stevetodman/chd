import { describe, expect, it } from "vitest";
import {
  feedbackForMurmurOption,
  getNextMurmurIndex,
  normalizeMurmurItems,
  type MurmurItemRow
} from "../lib/games/murmurs";

describe("murmur game helpers", () => {
  const itemRow = (overrides: Partial<MurmurItemRow> = {}): MurmurItemRow => ({
    id: "item-1",
    prompt_md: "prompt",
    rationale_md: "rationale",
    media_url: "media.mp3",
    murmur_options: [
      { id: "opt-a", label: "A", text_md: "Alpha", is_correct: true },
      { id: "opt-b", label: "B", text_md: "Beta", is_correct: false }
    ],
    ...overrides
  });

  it("normalizes murmur items", () => {
    const normalized = normalizeMurmurItems([itemRow({
      murmur_options: [
        { id: "opt-a", label: "A", text_md: "Alpha", is_correct: true },
        { id: "opt-b", label: "B", text_md: "Beta", is_correct: false }
      ]
    })]);

    expect(normalized).toEqual([
      {
        id: "item-1",
        prompt_md: "prompt",
        rationale_md: "rationale",
        media_url: "media.mp3",
        options: [
          { id: "opt-a", label: "A", text_md: "Alpha", is_correct: true },
          { id: "opt-b", label: "B", text_md: "Beta", is_correct: false }
        ]
      }
    ]);
  });

  it("handles missing option lists", () => {
    const normalized = normalizeMurmurItems([itemRow({ murmur_options: null })]);
    expect(normalized[0]?.options).toEqual([]);
  });

  it("cycles to the next murmur index", () => {
    expect(getNextMurmurIndex(0, 3)).toBe(1);
    expect(getNextMurmurIndex(2, 3)).toBe(0);
    expect(getNextMurmurIndex(5, 0)).toBe(0);
  });

  it("provides feedback for selections", () => {
    expect(
      feedbackForMurmurOption({ id: "opt-a", label: "A", text_md: "Alpha", is_correct: true })
    ).toBe("Correct!");
    expect(
      feedbackForMurmurOption({ id: "opt-b", label: "B", text_md: "Beta", is_correct: false })
    ).toBe("Try again");
    expect(feedbackForMurmurOption(null)).toBeNull();
  });
});

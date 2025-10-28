import { describe, expect, it } from "vitest";
import {
  DEFAULT_EKG_ALT_TEXT,
  feedbackForEkgOption,
  getNextEkgIndex,
  normalizeEkgItems,
  ekgAltTextForItem,
  type EkgItemRow
} from "../lib/games/ekg";

describe("ekg game helpers", () => {
  const itemRow = (overrides: Partial<EkgItemRow> = {}): EkgItemRow => ({
    id: "ekg-item-1",
    image_url: "image.png",
    prompt_md: "**Prompt**",
    explanation_md: "Explanation",
    rhythm: "Complete heart block",
    ekg_options: [
      { id: "opt-a", label: "A", text_md: "Option A", is_correct: true },
      { id: "opt-b", label: "B", text_md: "Option B", is_correct: false }
    ],
    ...overrides
  });

  it("normalizes ekg items", () => {
    const normalized = normalizeEkgItems([itemRow()]);
    expect(normalized).toEqual([
      {
        id: "ekg-item-1",
        image_url: "image.png",
        prompt_md: "**Prompt**",
        explanation_md: "Explanation",
        rhythm: "Complete heart block",
        options: [
          { id: "opt-a", label: "A", text_md: "Option A", is_correct: true },
          { id: "opt-b", label: "B", text_md: "Option B", is_correct: false }
        ]
      }
    ]);
  });

  it("handles missing option lists", () => {
    const normalized = normalizeEkgItems([itemRow({ ekg_options: null })]);
    expect(normalized[0]?.options).toEqual([]);
  });

  it("cycles ekg indices", () => {
    expect(getNextEkgIndex(0, 2)).toBe(1);
    expect(getNextEkgIndex(1, 2)).toBe(0);
    expect(getNextEkgIndex(3, 0)).toBe(0);
  });

  it("provides feedback strings", () => {
    expect(
      feedbackForEkgOption({ id: "opt-a", label: "A", text_md: "Option A", is_correct: true })
    ).toBe("Correct!");
    expect(
      feedbackForEkgOption({ id: "opt-b", label: "B", text_md: "Option B", is_correct: false })
    ).toBe("Not quite. Try another interpretation.");
    expect(feedbackForEkgOption(null)).toBeNull();
  });

  it("derives accessible alt text", () => {
    const normalized = normalizeEkgItems([
      itemRow({ rhythm: "Atrial flutter" }),
      itemRow({ rhythm: null, prompt_md: "Identify the **delta wave**." })
    ]);
    expect(ekgAltTextForItem(normalized[0] ?? null)).toBe("Electrocardiogram demonstrating Atrial flutter.");
    expect(ekgAltTextForItem(normalized[1] ?? null)).toBe("Electrocardiogram: Identify the delta wave.");
    expect(ekgAltTextForItem(null)).toBe(DEFAULT_EKG_ALT_TEXT);
  });
});

import { describe, it, expect } from "vitest";
import { clampMs, formatMs } from "../lib/utils";

describe("utils", () => {
  it("clamps milliseconds", () => {
    expect(clampMs(-10)).toBe(0);
    expect(clampMs(1000)).toBe(1000);
    expect(clampMs(700000)).toBe(600000);
  });

  it("formats milliseconds without rounding up a full second", () => {
    expect(formatMs()).toBe("–");
    expect(formatMs(980)).toBe("0s");
    expect(formatMs(59999)).toBe("59s");
    expect(formatMs(125000)).toBe("2m 5s");
  });
});

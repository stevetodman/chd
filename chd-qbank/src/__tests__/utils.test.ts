import { describe, expect, it } from "vitest";
import { clampMs, classNames, formatMs, percentage } from "../lib/utils";

describe("utils", () => {
  it("formats milliseconds", () => {
    expect(formatMs(null)).toBe("–");
    expect(formatMs(900)).toBe("1s");
    expect(formatMs(62_000)).toBe("1m 2s");
  });

  it("clamps milliseconds", () => {
    expect(clampMs(-100)).toBe(0);
    expect(clampMs(100)).toBe(100);
    expect(clampMs(999_999)).toBe(600_000);
  });

  it("formats percentage", () => {
    expect(percentage(0, 0)).toBe("0%");
    expect(percentage(1, 4)).toBe("25%");
  });

  it("joins class names", () => {
    expect(classNames("a", null, "b", false, "c")).toBe("a b c");
  });
});

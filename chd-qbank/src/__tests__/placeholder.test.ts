import { describe, it, expect } from "vitest";
import { clampMs } from "../lib/utils";

describe("utils", () => {
  it("clamps milliseconds", () => {
    expect(clampMs(-10)).toBe(0);
    expect(clampMs(1000)).toBe(1000);
    expect(clampMs(700000)).toBe(600000);
  });
});

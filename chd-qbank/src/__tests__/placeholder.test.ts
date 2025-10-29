import { describe, it, expect } from "vitest";
import { clampMs, formatMs, percentage, classNames } from "../lib/utils";

describe("utils", () => {
  describe("clampMs", () => {
    it("does not allow negative values", () => {
      expect(clampMs(-10)).toBe(0);
    });

    it("allows values within the range", () => {
      expect(clampMs(1000)).toBe(1000);
    });

    it("caps values to ten minutes", () => {
      expect(clampMs(700_000)).toBe(600_000);
    });
  });

  describe("formatMs", () => {
    it("formats missing durations", () => {
      expect(formatMs()).toBe("–");
    });

    it("formats durations without rounding up a full second", () => {
      expect(formatMs(980)).toBe("0s");
    });

    it("formats durations under a minute", () => {
      expect(formatMs(59_999)).toBe("59s");
    });

    it("formats durations with minutes and seconds", () => {
      expect(formatMs(125_000)).toBe("2m 5s");
    });
  });

  describe("percentage", () => {
    it("returns 0% when the total is zero", () => {
      expect(percentage(5, 0)).toBe("0%");
    });

    it("rounds the percentage to the nearest whole number", () => {
      expect(percentage(1, 3)).toBe("33%");
      expect(percentage(2, 3)).toBe("67%");
    });
  });

  describe("classNames", () => {
    it("joins truthy class names and ignores falsy ones", () => {
      const includeBar = false;
      expect(classNames("foo", includeBar && "bar", undefined, "baz", null, "qux")).toBe(
        "foo baz qux",
      );
    });
  });
});

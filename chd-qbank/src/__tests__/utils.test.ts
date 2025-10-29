import { describe, expect, it } from "vitest";
import {
  classNames,
  clampMs,
  extractErrorMessage,
  formatMs,
  getErrorMessage,
  normalizeErrorMessage,
  percentage,
} from "../lib/utils";

describe("utils", () => {
  describe("formatMs", () => {
    it("returns an en dash when value is nullish", () => {
      expect(formatMs(undefined)).toBe("–");
      expect(formatMs(null)).toBe("–");
    });

    it("formats durations under a minute as seconds", () => {
      expect(formatMs(4250)).toBe("4s");
    });

    it("formats durations over a minute with minutes and seconds", () => {
      expect(formatMs(125_000)).toBe("2m 5s");
    });
  });

  describe("clampMs", () => {
    it("clamps negative values to zero", () => {
      expect(clampMs(-100)).toBe(0);
    });

    it("clamps large values to the practice timer maximum", () => {
      expect(clampMs(999_999)).toBe(600_000);
    });

    it("returns values within the range unchanged", () => {
      expect(clampMs(123_456)).toBe(123_456);
    });
  });

  describe("percentage", () => {
    it("returns 0% when the total is zero", () => {
      expect(percentage(5, 0)).toBe("0%");
    });

    it("rounds to the nearest whole percentage", () => {
      expect(percentage(1, 3)).toBe("33%");
      expect(percentage(2, 3)).toBe("67%");
    });
  });

  describe("classNames", () => {
    it("joins truthy classes and drops falsy entries", () => {
      expect(classNames("a", false, "b", undefined, "c", null)).toBe("a b c");
    });

    it("returns an empty string when all entries are falsy", () => {
      expect(classNames(false, null, undefined, "")).toBe("");
    });
  });

  describe("extractErrorMessage", () => {
    it("returns trimmed message from an Error instance", () => {
      const error = new Error("  Something went wrong  ");
      expect(extractErrorMessage(error)).toBe("Something went wrong");
    });

    it("returns trimmed message from a string", () => {
      expect(extractErrorMessage("  plain string error  ")).toBe("plain string error");
    });

    it("returns trimmed message from an object with message property", () => {
      expect(extractErrorMessage({ message: "  error text  " })).toBe("error text");
    });

    it("returns null when no message can be derived", () => {
      expect(extractErrorMessage({})).toBeNull();
      expect(extractErrorMessage({ message: "   " })).toBeNull();
      expect(extractErrorMessage(null)).toBeNull();
    });

    it("ignores message values that are not strings", () => {
      expect(extractErrorMessage({ message: 42 })).toBeNull();
    });
  });

  describe("getErrorMessage", () => {
    it("returns extracted message when available", () => {
      const error = new Error("Boom");
      expect(getErrorMessage(error, "fallback")).toBe("Boom");
    });

    it("falls back when no message can be derived", () => {
      expect(getErrorMessage({}, "fallback")).toBe("fallback");
    });
  });

  describe("normalizeErrorMessage", () => {
    it("returns lowercased extracted message", () => {
      expect(normalizeErrorMessage("  Mixed Case  ")).toBe("mixed case");
    });

    it("returns null when message cannot be derived", () => {
      expect(normalizeErrorMessage({})).toBeNull();
    });
  });
});

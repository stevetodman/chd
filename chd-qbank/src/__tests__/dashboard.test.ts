import { describe, expect, it } from "vitest";
import { normalizeDashboardMetrics } from "../lib/dashboard";

describe("normalizeDashboardMetrics", () => {
  it("converts strings and numbers to numeric metrics", () => {
    const result = normalizeDashboardMetrics({
      total_attempts: "12",
      correct_attempts: 8,
      flagged_count: "3",
      weekly_points: "5",
      all_time_points: "21"
    });

    expect(result).toEqual({
      total_attempts: 12,
      correct_attempts: 8,
      flagged_count: 3,
      weekly_points: 5,
      all_time_points: 21
    });
  });

  it("returns zeros when the row is null", () => {
    const result = normalizeDashboardMetrics(null);
    expect(result).toEqual({
      total_attempts: 0,
      correct_attempts: 0,
      flagged_count: 0,
      weekly_points: 0,
      all_time_points: 0
    });
  });

  it("guards against non-numeric values", () => {
    const result = normalizeDashboardMetrics({
      total_attempts: "abc",
      correct_attempts: null,
      flagged_count: undefined,
      weekly_points: "4.5",
      all_time_points: "-"
    } as unknown as Parameters<typeof normalizeDashboardMetrics>[0]);

    expect(result).toEqual({
      total_attempts: 0,
      correct_attempts: 0,
      flagged_count: 0,
      weekly_points: 4.5,
      all_time_points: 0
    });
  });
});

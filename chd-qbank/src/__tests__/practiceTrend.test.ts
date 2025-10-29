import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeWeeklyStreak, fetchPracticeTrendData } from "../lib/practiceTrend";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  order: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc
  }
}));

describe("practice trend helpers", () => {
  beforeEach(() => {
    Object.values(supabaseMocks).forEach((mock) => {
      if (typeof mock.mockReset === "function") {
        mock.mockReset();
      }
    });

    supabaseMocks.from.mockReturnValue({ select: supabaseMocks.select });
    supabaseMocks.select.mockImplementation(() => ({ eq: supabaseMocks.eq }));
    supabaseMocks.eq.mockImplementation(() => ({ gte: supabaseMocks.gte }));
    supabaseMocks.gte.mockImplementation(() => ({ order: supabaseMocks.order }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes the current weekly streak based on trailing attempts", () => {
    const data = [
      { label: "Apr 1", attempts: 0, accuracy: null },
      { label: "Apr 8", attempts: 3, accuracy: 66.67 },
      { label: "Apr 15", attempts: 2, accuracy: 50 }
    ];

    expect(computeWeeklyStreak(data)).toBe(2);
  });

  it("returns zero when the latest week has no attempts", () => {
    const data = [
      { label: "Mar 25", attempts: 1, accuracy: 100 },
      { label: "Apr 1", attempts: 0, accuracy: null }
    ];

    expect(computeWeeklyStreak(data)).toBe(0);
  });

  it("aggregates responses into weekly practice summaries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 3, 17, 12, 0, 0)));

    supabaseMocks.order.mockResolvedValue({
      data: [
        { created_at: "2024-04-02T10:00:00.000Z", is_correct: true },
        { created_at: "2024-04-08T12:00:00.000Z", is_correct: true },
        { created_at: "2024-04-09T12:00:00.000Z", is_correct: false },
        { created_at: "2024-04-15T15:00:00.000Z", is_correct: false },
        { created_at: "2024-04-15T16:00:00.000Z", is_correct: true },
        { created_at: null, is_correct: true }
      ],
      error: null
    });

    const result = await fetchPracticeTrendData("user-1", 3);

    expect(supabaseMocks.from).toHaveBeenCalledWith("responses");
    expect(supabaseMocks.select).toHaveBeenCalledWith("created_at, is_correct");
    expect(supabaseMocks.eq).toHaveBeenCalledWith("user_id", "user-1");

    const [, isoString] = supabaseMocks.gte.mock.calls[0];
    expect(isoString).toBe("2024-04-01T00:00:00.000Z");

    expect(result).toEqual([
      { label: "Apr 1", attempts: 1, accuracy: 100 },
      { label: "Apr 8", attempts: 2, accuracy: 50 },
      { label: "Apr 15", attempts: 2, accuracy: 50 }
    ]);
  });
});

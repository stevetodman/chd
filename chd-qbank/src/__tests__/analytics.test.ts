import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminHeatmap,
  fetchItemStats,
  fetchReliabilitySnapshot,
  refreshReliabilityMetrics
} from "../lib/analytics";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc
  }
}));

describe("analytics api helpers", () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset();
    supabaseMocks.select.mockReset();
    supabaseMocks.rpc.mockReset();

    supabaseMocks.from.mockReturnValue({ select: supabaseMocks.select });
  });

  it("fetches item stats and returns typed rows", async () => {
    const rows = [{ id: "item-1" }, { id: "item-2" }];
    supabaseMocks.select.mockResolvedValue({ data: rows, error: null });

    const result = await fetchItemStats();

    expect(supabaseMocks.from).toHaveBeenCalledWith("item_stats_public");
    expect(supabaseMocks.select).toHaveBeenCalledWith("*");
    expect(result).toEqual(rows);
  });

  it("throws when fetching item stats fails", async () => {
    const error = new Error("boom");
    supabaseMocks.select.mockResolvedValue({ data: null, error });

    await expect(fetchItemStats()).rejects.toThrow(error);
  });

  it("fetches admin heatmap analytics", async () => {
    const rows = [{ day: "2024-04-15" }];
    supabaseMocks.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await fetchAdminHeatmap();

    expect(supabaseMocks.rpc).toHaveBeenCalledWith("analytics_heatmap_admin");
    expect(result).toEqual(rows);
  });

  it("returns an empty array when the heatmap response is null", async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: null, error: null });

    const result = await fetchAdminHeatmap();

    expect(result).toEqual([]);
  });

  it("returns the latest reliability snapshot", async () => {
    const rows = [{ id: "snapshot-1" }, { id: "snapshot-0" }];
    supabaseMocks.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await fetchReliabilitySnapshot();

    expect(supabaseMocks.rpc).toHaveBeenCalledWith("analytics_reliability_snapshot");
    expect(result).toEqual(rows[0]);
  });

  it("returns null when no reliability snapshots exist", async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: [], error: null });

    await expect(fetchReliabilitySnapshot()).resolves.toBeNull();
  });

  it("throws when refreshing reliability metrics fails", async () => {
    const error = new Error("nope");
    supabaseMocks.rpc.mockResolvedValue({ error });

    await expect(refreshReliabilityMetrics()).rejects.toThrow(error);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("analytics_refresh_reliability");
  });

  it("refreshes reliability metrics successfully", async () => {
    supabaseMocks.rpc.mockResolvedValue({ error: null });

    await expect(refreshReliabilityMetrics()).resolves.toBeUndefined();
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("analytics_refresh_reliability");
  });
});

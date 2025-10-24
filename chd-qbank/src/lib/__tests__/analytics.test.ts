import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn()
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: hoisted.rpcMock,
    from: hoisted.fromMock
  }
}));

import { fetchAdminHeatmap, fetchReliabilitySnapshot, refreshReliabilityMetrics } from "../analytics";

describe("analytics access control", () => {
  beforeEach(() => {
    hoisted.rpcMock.mockReset();
    hoisted.fromMock.mockReset();
  });

  it("throws when non-admin clients invoke admin-only analytics RPCs", async () => {
    hoisted.rpcMock.mockResolvedValueOnce({ data: null, error: { message: "permission denied", code: "42501" } });

    await expect(fetchAdminHeatmap()).rejects.toMatchObject({ message: "permission denied" });
    expect(hoisted.rpcMock).toHaveBeenCalledWith("analytics_heatmap_admin");
  });

  it("returns rows for admin users", async () => {
    const rows = [{ bin: "Mon", total: 4 }];
    hoisted.rpcMock.mockResolvedValueOnce({ data: rows, error: null });

    await expect(fetchAdminHeatmap()).resolves.toEqual(rows);
  });

  it("picks the most recent reliability snapshot", async () => {
    const snapshot = { generated_at: "2024-05-20", cron_total: 10, cron_success: 9 };
    hoisted.rpcMock.mockResolvedValueOnce({ data: [snapshot], error: null });

    await expect(fetchReliabilitySnapshot()).resolves.toEqual(snapshot);
  });

  it("propagates errors when refreshing reliability metrics without admin access", async () => {
    hoisted.rpcMock.mockResolvedValueOnce({ data: null, error: { message: "RLS denied", code: "42501" } });

    await expect(refreshReliabilityMetrics()).rejects.toMatchObject({ message: "RLS denied" });
  });
});

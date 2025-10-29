import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReliabilitySnapshotCard from "../components/Charts/ReliabilitySnapshotCard";
import type { ReliabilitySnapshot } from "../lib/constants";
import * as analytics from "../lib/analytics";

vi.mock("../lib/analytics", () => ({
  fetchReliabilitySnapshot: vi.fn(),
  refreshReliabilityMetrics: vi.fn()
}));

const fetchReliabilitySnapshot = vi.mocked(analytics.fetchReliabilitySnapshot);
const refreshReliabilityMetrics = vi.mocked(analytics.refreshReliabilityMetrics);

const snapshotFixture: ReliabilitySnapshot = {
  kr20_alpha: 0.82,
  cronbach_alpha: 0.79,
  n_items: 120,
  n_users: 56,
  total_attempts: 4500,
  score_variance: 12.345,
  sum_item_variance: 42.987,
  last_computed_at: "2024-03-15T12:00:00.000Z"
};

describe("ReliabilitySnapshotCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders metrics when a snapshot is available", async () => {
    fetchReliabilitySnapshot.mockResolvedValueOnce(snapshotFixture);

    render(<ReliabilitySnapshotCard />);

    expect(screen.getByText(/Loading reliability snapshot/i)).toBeInTheDocument();

    expect(await screen.findByText("0.82")).toBeInTheDocument();
    expect(screen.getByText("0.79")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("4,500")).toBeInTheDocument();
    expect(screen.getByText("12.35")).toBeInTheDocument();
    expect(screen.getByText("42.99")).toBeInTheDocument();
    expect(screen.getByTestId("reliability-computed-at").textContent).toContain("2024");
  });

  it("shows an empty state when no snapshot exists", async () => {
    fetchReliabilitySnapshot.mockResolvedValueOnce(null);

    render(<ReliabilitySnapshotCard />);

    expect(
      await screen.findByText(/No reliability snapshot available yet/i)
    ).toBeInTheDocument();
  });

  it("surfaces load errors", async () => {
    fetchReliabilitySnapshot.mockRejectedValueOnce(new Error("network down"));

    render(<ReliabilitySnapshotCard />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to load reliability snapshot: network down");
  });

  it("refreshes metrics on demand", async () => {
    fetchReliabilitySnapshot
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...snapshotFixture, kr20_alpha: 0.91 });
    refreshReliabilityMetrics.mockResolvedValueOnce();

    render(<ReliabilitySnapshotCard />);

    const refreshButton = await screen.findByRole("button", { name: /refresh metrics/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(refreshReliabilityMetrics).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("0.91")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Reliability metrics refreshed/i);
  });

  it("shows an error status when refresh fails", async () => {
    fetchReliabilitySnapshot.mockResolvedValueOnce(snapshotFixture);
    refreshReliabilityMetrics.mockRejectedValueOnce(new Error("rpc failed"));

    render(<ReliabilitySnapshotCard />);

    const refreshButton = await screen.findByRole("button", { name: /refresh metrics/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(refreshReliabilityMetrics).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("rpc failed");
  });
});

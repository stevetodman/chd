import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leaderboardTableMock: vi.fn(() => <div data-testid="leaderboard-table">mock-table</div>)
}));

vi.mock("../components/LeaderboardTable", () => ({
  default: mocks.leaderboardTableMock
}));

import Leaderboard from "../pages/Leaderboard";

describe("Leaderboard page", () => {
  it("renders the headline copy and leaderboard table placeholder", () => {
    const markup = renderToStaticMarkup(<Leaderboard />);
    expect(markup).toContain("Leaderboard");
    expect(markup).toContain("Aliases only. Weekly and all-time filters included.");
    expect(markup).toContain("data-testid=\"leaderboard-table\"");
    expect(mocks.leaderboardTableMock).toHaveBeenCalled();
  });
});

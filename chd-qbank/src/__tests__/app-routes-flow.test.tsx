import { beforeEach, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet } from "react-router-dom";
import { Suspense } from "react";

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "http://localhost";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "test-anon-key";

vi.mock("../components/Layout", () => ({
  default: () => (
    <div data-testid="app-layout">
      <Outlet />
    </div>
  )
}));

vi.mock("../pages/Login", () => ({
  default: () => <div>Login Page</div>
}));

vi.mock("../pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>
}));

vi.mock("../pages/Practice", () => ({
  default: () => <div>Practice Page</div>
}));

vi.mock("../pages/Leaderboard", () => ({
  default: () => <div>Leaderboard Page</div>
}));

vi.mock("../pages/Admin/Items", () => ({
  default: () => <div>Admin Items Page</div>
}));

import { AppRoutes } from "../routes";
import * as authModule from "../lib/auth";
import { useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";

type SessionValue = ReturnType<typeof useSessionStore.getState>["session"];

const requireAdminSpy = vi.spyOn(authModule, "requireAdmin");

const initialLoadSettings = useSettingsStore.getState().loadSettings;
const initialSetLeaderboardEnabled = useSettingsStore.getState().setLeaderboardEnabled;
let loadSettingsMock: ReturnType<typeof vi.fn>;

function renderRoutes(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Suspense fallback={<div>Loading…</div>}>
        <AppRoutes />
      </Suspense>
    </MemoryRouter>
  );
}

beforeEach(() => {
  requireAdminSpy.mockReset();
  requireAdminSpy.mockResolvedValue(true);
  useSessionStore.setState({ session: null, loading: false, initialized: true });

  loadSettingsMock = vi.fn(async () => {
    useSettingsStore.setState({ loading: false, loaded: true });
  });

  useSettingsStore.setState({
    leaderboardEnabled: false,
    loading: false,
    loaded: true,
    loadSettings: loadSettingsMock
  });
});

afterEach(() => {
  useSessionStore.setState({ session: null, loading: true, initialized: false });
  useSettingsStore.setState({
    leaderboardEnabled: false,
    loading: false,
    loaded: false,
    loadSettings: initialLoadSettings,
    setLeaderboardEnabled: initialSetLeaderboardEnabled
  });
});

afterAll(() => {
  requireAdminSpy.mockRestore();
});

describe("AppRoutes integration", () => {
  it("redirects unauthenticated users to the login page", async () => {
    renderRoutes(["/practice"]);

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("renders the dashboard for authenticated users", async () => {
    useSessionStore.setState({
      session: { user: { id: "user-1" } } as unknown as SessionValue,
      loading: false,
      initialized: true
    });

    renderRoutes(["/dashboard"]);

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("redirects non-admin users away from admin routes", async () => {
    useSessionStore.setState({
      session: { user: { id: "user-1" } } as unknown as SessionValue,
      loading: false,
      initialized: true
    });

    requireAdminSpy.mockResolvedValueOnce(false);

    renderRoutes(["/admin/items"]);

    await waitFor(() => {
      expect(requireAdminSpy).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("loads settings and redirects when the leaderboard is disabled", async () => {
    useSessionStore.setState({
      session: { user: { id: "user-1" } } as unknown as SessionValue,
      loading: false,
      initialized: true
    });

    loadSettingsMock.mockImplementationOnce(async () => {
      useSettingsStore.setState({
        loading: false,
        loaded: true,
        leaderboardEnabled: false
      });
    });

    useSettingsStore.setState({ loading: false, loaded: false, leaderboardEnabled: false });

    renderRoutes(["/leaderboard"]);

    await waitFor(() => {
      expect(loadSettingsMock).toHaveBeenCalled();
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("loads settings and renders the leaderboard when enabled", async () => {
    useSessionStore.setState({
      session: { user: { id: "user-1" } } as unknown as SessionValue,
      loading: false,
      initialized: true
    });

    loadSettingsMock.mockImplementationOnce(async () => {
      useSettingsStore.setState({
        loading: false,
        loaded: true,
        leaderboardEnabled: true
      });
    });

    useSettingsStore.setState({ loading: false, loaded: false, leaderboardEnabled: false });

    renderRoutes(["/leaderboard"]);

    await waitFor(() => {
      expect(loadSettingsMock).toHaveBeenCalled();
    });

    expect(await screen.findByText("Leaderboard Page")).toBeInTheDocument();
  });
});

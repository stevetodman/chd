const supabaseMock = vi.hoisted(() => ({
  functions: {
    invoke: vi.fn()
  },
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  },
  from: vi.fn()
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: supabaseMock
}));

const fetchMock = vi.hoisted(() => vi.fn());

import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Signup from "../../src/pages/Signup";
import Login from "../../src/pages/Login";
import { useSessionStore } from "../../src/lib/auth";

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderAuthFlow(initialEntries = ["/login"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockJsonResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  } as Response;
}

async function verifyAliasExists(alias: string) {
  const response = await fetch(`/tests/helpers/app_users?alias=${encodeURIComponent(alias)}`);
  expect(response.ok).toBe(true);
  const payload = await response.json();
  const rows = (payload as { rows?: Array<{ alias: string }> }).rows ?? [];
  const match = rows.some((row) => row.alias === alias);
  expect(match).toBe(true);
}

describe("invite code signup flow", () => {
  beforeEach(() => {
    supabaseMock.functions.invoke.mockReset();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockReset();
    useSessionStore.setState({ session: null, loading: false, initialized: true });
  });

  it("completes signup with a valid invite code and verifies alias persistence", async () => {
    const aliasFromServer = "Swift-Sparrow-417";
    fetchMock.mockImplementation(async (input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/tests/helpers/app_users")) {
        const url = new URL(input, "https://example.test");
        const aliasParam = url.searchParams.get("alias");
        return mockJsonResponse({ rows: aliasParam ? [{ alias: aliasParam }] : [] });
      }
      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: { ok: true, alias: aliasFromServer, user_id: "user-123" },
      error: null
    });

    const user = userEvent.setup();
    renderAuthFlow();

    await user.click(screen.getByRole("link", { name: /sign up/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /join chd qbank/i })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "strongpass123");
    await user.type(screen.getByLabelText(/invite code/i), "CODE42");
    await user.type(screen.getByLabelText(/preferred alias/i), "Desired-Alias-1");

    await user.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() => expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1));

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("signup-with-code", {
      body: {
        email: "jane@example.com",
        password: "strongpass123",
        invite_code: "CODE42",
        desired_alias: "Desired-Alias-1"
      }
    });

    const aliasEl = await screen.findByTestId("signup-created-alias");
    expect(aliasEl).toHaveTextContent(aliasFromServer);

    await verifyAliasExists(aliasFromServer);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the invite code is invalid", async () => {
    fetchMock.mockImplementation(() => {
      throw new Error("Test helper should not be called for invalid codes");
    });

    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid invite code", status: 400 }
    });

    const user = userEvent.setup();
    renderAuthFlow(["/signup"]);

    await user.type(screen.getByLabelText(/email/i), "lee@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "hunter2!!");
    await user.type(screen.getByLabelText(/invite code/i), "WRONG");

    await user.click(screen.getByRole("button", { name: /request access/i }));

    await screen.findByText("Invalid invite code");
    expect(screen.queryByTestId("signup-created-alias")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a rate-limit error when too many attempts are made", async () => {
    fetchMock.mockImplementation(() => {
      throw new Error("Test helper should not be called when rate limited");
    });

    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Too many requests", status: 429 }
    });

    const user = userEvent.setup();
    renderAuthFlow(["/signup"]);

    await user.type(screen.getByLabelText(/email/i), "max@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "rateLimit!23");
    await user.type(screen.getByLabelText(/invite code/i), "CODE42");

    await user.click(screen.getByRole("button", { name: /request access/i }));

    await screen.findByText("Too many requests");
    expect(screen.queryByTestId("signup-created-alias")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the alias returned by the server when a collision occurs", async () => {
    const desiredAlias = "Swift-Sparrow-417";
    const reassignedAlias = "Calm-Ibis-902";

    fetchMock.mockImplementation(async (input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/tests/helpers/app_users")) {
        const url = new URL(input, "https://example.test");
        const aliasParam = url.searchParams.get("alias");
        return mockJsonResponse({ rows: aliasParam ? [{ alias: aliasParam }] : [] });
      }
      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    supabaseMock.functions.invoke.mockResolvedValueOnce({
      data: { ok: true, alias: reassignedAlias, user_id: "user-456" },
      error: null
    });

    const user = userEvent.setup();
    renderAuthFlow(["/signup"]);

    await user.type(screen.getByLabelText(/email/i), "carla@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "aliasRock!");
    await user.type(screen.getByLabelText(/invite code/i), "CODE42");
    await user.type(screen.getByLabelText(/preferred alias/i), desiredAlias);

    await user.click(screen.getByRole("button", { name: /request access/i }));

    const aliasEl = await screen.findByTestId("signup-created-alias");
    expect(aliasEl).toHaveTextContent(reassignedAlias);
    expect(aliasEl).not.toHaveTextContent(desiredAlias);

    await verifyAliasExists(reassignedAlias);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from "vitest";
import { signIn, signOut, requireAuth, requireAdmin, useSessionStore } from "../lib/auth";
import { supabaseMock, setMockSession, setTableConfig } from "./test-utils/supabaseMock";
import { logError } from "../lib/telemetry";

describe("auth helpers", () => {
  it("signs in and stores session", async () => {
    const session = { user: { id: "user-123" } };
    setMockSession(session);
    const result = await signIn("demo@example.com", "secret");
    expect(result).toBe(session);
    expect(useSessionStore.getState().session).toBe(session);
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "demo@example.com",
      password: "secret"
    });
  });

  it("logs and rethrows sign-in errors", async () => {
    const error = new Error("invalid");
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error });
    await expect(signIn("demo@example.com", "bad")).rejects.toThrowError("invalid");
    expect(logError).toHaveBeenCalled();
  });

  it("signs out", async () => {
    setMockSession({ user: { id: "user" } });
    await signOut();
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it("throws when auth required without session", async () => {
    setMockSession(null);
    await expect(requireAuth()).rejects.toThrowError("AUTH_REQUIRED");
  });

  it("checks for admin role", async () => {
    const session = { user: { id: "admin" } };
    setMockSession(session);
    useSessionStore.setState({ session, loading: false });
    setTableConfig("app_users", {
      maybeSingleResult: { data: { role: "admin" }, error: null }
    });
    await expect(requireAdmin()).resolves.toBe(true);
    setTableConfig("app_users", {
      maybeSingleResult: { data: { role: "member" }, error: null }
    });
    await expect(requireAdmin()).resolves.toBe(false);
  });
});

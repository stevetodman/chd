import { afterEach, vi } from "vitest";
import { supabaseMock, resetSupabaseMock, resetMockSession } from "./test-utils/supabaseMock";

vi.mock("../lib/supabaseClient", () => ({
  supabase: supabaseMock
}));

vi.mock("../lib/telemetry", () => ({
  initTelemetry: vi.fn(),
  logError: vi.fn(),
  logMetric: vi.fn()
}));

// Import after mocks to ensure the store uses the mocked client.
import { useSessionStore } from "../lib/auth";

afterEach(() => {
  resetSupabaseMock();
  resetMockSession();
  useSessionStore.setState({ session: null, loading: true });
});

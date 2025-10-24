const navigateMock = vi.fn();

const supabaseMock = vi.hoisted(() => ({
  auth: {
    resetPasswordForEmail: vi.fn()
  }
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: supabaseMock
}));

vi.mock("../../src/lib/auth", () => ({
  signIn: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../../src/pages/Login";
import { MemoryRouter } from "react-router-dom";

describe("login helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_INVITE_CODE", "CHD2025FALL");
    vi.stubEnv("VITE_INVITE_EXPIRES", "2025-12-31");
    supabaseMock.auth.resetPasswordForEmail.mockReset();
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends password reset instructions", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /forgot your password/i }));
    await user.type(screen.getByLabelText(/account email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com");
    });

    await screen.findByText(/password reset email sent/i);
  });

  it("reveals the configured invite code for self-service", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /need your invite code again/i }));

    await screen.findByText("CHD2025FALL");
    expect(screen.getByText(/valid through/i).textContent).toContain("2025");
  });
});

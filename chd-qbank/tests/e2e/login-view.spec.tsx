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
import { I18nProvider } from "../../src/i18n";
import { FALLBACK_LOCALE, messages } from "../../src/locales";

describe("login helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    supabaseMock.auth.resetPasswordForEmail.mockReset();
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends password reset instructions", async () => {
    render(
      <MemoryRouter>
        <I18nProvider
          messages={messages}
          initialLocale="en"
          fallbackLocale={FALLBACK_LOCALE}
        >
          <Login />
        </I18nProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /forgot your password/i }));
    await user.type(screen.getByLabelText(/account email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    const expectedOrigin = (typeof window !== "undefined" && window.location?.origin) || "http://localhost";
    const normalizedOrigin = expectedOrigin.replace(/\/$/, "");

    await waitFor(() => {
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({
          redirectTo: `${normalizedOrigin}/reset-password?email=user%40example.com`
        })
      );
    });

    await screen.findByText(/password reset email sent/i);
  });

  it("directs users to request invite codes from administrators", async () => {
    render(
      <MemoryRouter>
        <I18nProvider
          messages={messages}
          initialLocale="en"
          fallbackLocale={FALLBACK_LOCALE}
        >
          <Login />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByText(/invite codes are issued by administrators/i)
    ).toBeInTheDocument();
  });
});

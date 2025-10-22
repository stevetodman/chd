const navigateMock = vi.fn();

const supabaseMock = vi.hoisted(() => ({
  functions: {
    invoke: vi.fn()
  }
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: supabaseMock
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
import { beforeEach, describe, expect, it, vi } from "vitest";
import Signup from "../../src/pages/Signup";
import { MemoryRouter } from "react-router-dom";

describe("onboarding signup flow", () => {
  beforeEach(() => {
    supabaseMock.functions.invoke.mockReset();
    navigateMock.mockReset();
  });

  it("requests access with an invite code and navigates to login on success", async () => {
    const invoke = supabaseMock.functions.invoke;
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersafe");
    await user.type(screen.getByLabelText(/invite code/i), "ABC123");
    await user.type(screen.getByLabelText(/preferred alias/i), "Swift-Swan-99");

    await user.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    await screen.findByText("Account created. Please sign in.");

    expect(invoke).toHaveBeenCalledWith("signup-with-code", {
      body: {
        email: "jane@example.com",
        password: "supersafe",
        invite_code: "ABC123",
        desired_alias: "Swift-Swan-99"
      }
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/login");
    });
  });

  it("surfaces Supabase errors to the user", async () => {
    const invoke = supabaseMock.functions.invoke;
    invoke.mockResolvedValueOnce({ data: { ok: false, error: "Invite code already used" }, error: null });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "alex@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.type(screen.getByLabelText(/invite code/i), "INVITE");
    await user.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    await screen.findByText("Invite code already used");

    expect(navigateMock).not.toHaveBeenCalled();
  });
});

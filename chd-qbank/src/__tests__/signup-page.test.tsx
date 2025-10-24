import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const hoisted = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  navigateMock: vi.fn(),
  tMock: vi.fn((key: string, opts?: { defaultValue?: string; app?: string }) => opts?.defaultValue ?? key)
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigateMock
  };
});

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    functions: {
      invoke: hoisted.invokeMock
    }
  }
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({ t: hoisted.tMock })
}));

import Signup from "../pages/Signup";

let uuidSpy: ReturnType<typeof vi.spyOn>;

describe("signup page", () => {
  beforeEach(() => {
    hoisted.invokeMock.mockReset();
    hoisted.navigateMock.mockReset();
    hoisted.tMock.mockClear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    uuidSpy = vi.spyOn(crypto, "randomUUID");
    uuidSpy.mockImplementation(() => "initial-key");
  });

  const fillForm = async () => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "Sup3rSecret!");
    await user.type(screen.getByLabelText(/invite code/i), "INVITE-123");
    await user.type(screen.getByLabelText(/preferred alias/i), "Alias");
    return user;
  };

  it("submits the edge function and navigates on success", async () => {
    vi.useFakeTimers();

    hoisted.invokeMock.mockResolvedValueOnce({
      data: { ok: true, alias: "Swift-Sparrow-123", user_id: "user-1" },
      error: null
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    uuidSpy.mockImplementationOnce(() => "next-key");

    const user = await fillForm();
    await user.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() =>
      expect(hoisted.invokeMock).toHaveBeenCalledWith("signup-with-code", {
        body: {
          email: "user@example.com",
          password: "Sup3rSecret!",
          invite_code: "INVITE-123",
          desired_alias: "Alias"
        },
        headers: { "Idempotency-Key": "initial-key" }
      })
    );

    expect(await screen.findByText(/Account created/i)).toBeInTheDocument();

    vi.runAllTimers();
    expect(hoisted.navigateMock).toHaveBeenCalledWith("/login");
    expect(uuidSpy).toHaveBeenCalledTimes(2);
  });

  it("shows validation errors returned by the edge function", async () => {
    uuidSpy.mockReturnValue("initial-key");
    hoisted.invokeMock.mockResolvedValueOnce({
      data: { ok: false, error: "Invalid invite code" },
      error: null
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const user = await fillForm();
    await user.click(screen.getByRole("button", { name: /request access/i }));

    expect(await screen.findByText("Invalid invite code")).toBeInTheDocument();
    expect(hoisted.navigateMock).not.toHaveBeenCalled();
  });

  it("surfaces unexpected edge function errors", async () => {
    uuidSpy.mockReturnValue("initial-key");
    hoisted.invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: "403 Forbidden" }
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const user = await fillForm();
    await user.click(screen.getByRole("button", { name: /request access/i }));

    expect(await screen.findByText(/Unable to sign up/i)).toBeInTheDocument();
    expect(hoisted.navigateMock).not.toHaveBeenCalled();
  });

});

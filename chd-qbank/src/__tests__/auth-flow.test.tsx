import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { navigateMock, signInMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  signInMock: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock("../lib/auth", () => ({
  signIn: signInMock
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key
  })
}));

import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

describe("auth flow", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
  });

  it("signs in successfully and redirects to the dashboard", async () => {
    signInMock.mockResolvedValueOnce({});
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith("user@example.com", "password"));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows an error message when credentials are invalid", async () => {
    signInMock.mockRejectedValueOnce(new Error("Invalid credentials"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

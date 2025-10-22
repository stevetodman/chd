import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

describe("auth flow", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
  });

  it("signs in successfully and redirects to the dashboard", async () => {
    signInMock.mockResolvedValueOnce({});
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getAllByLabelText(/email/i)[0] as HTMLInputElement;
    const passwordInput = screen.getAllByLabelText(/password/i)[0] as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password" } });
    const signInButton = screen.getAllByRole("button", { name: /sign in/i })[0];
    fireEvent.click(signInButton);

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith("user@example.com", "password"));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows an error message when credentials are invalid", async () => {
    signInMock.mockRejectedValueOnce(new Error("Invalid credentials"));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getAllByLabelText(/email/i)[0] as HTMLInputElement;
    const passwordInput = screen.getAllByLabelText(/password/i)[0] as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrong-password" } });
    const signInButton = screen.getAllByRole("button", { name: /sign in/i })[0];
    fireEvent.click(signInButton);

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

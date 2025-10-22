import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() }
  }
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>
}));

import Signup, { SignupForm, signupWithInvite } from "../pages/Signup";

describe("Signup page", () => {
  it("renders the hero heading", () => {
    const markup = renderToStaticMarkup(<Signup />);
    expect(markup).toContain("Join CHD QBank");
    expect(markup).toContain("Request access");
  });

  it("invokes the signup edge function and returns the response", async () => {
    const invokeMock = vi.fn().mockResolvedValue({ data: { ok: true, token: "abc" }, error: null });
    const supabaseMock = { functions: { invoke: invokeMock } } as unknown as Parameters<typeof signupWithInvite>[0];
    const form: SignupForm = {
      email: "user@example.com",
      password: "secret",
      invite_code: "CODE",
      desired_alias: "Alias"
    };

    const result = await signupWithInvite(supabaseMock, form);

    expect(result).toEqual({ ok: true, token: "abc" });
    expect(invokeMock).toHaveBeenCalledWith("signup-with-code", { body: form });
  });

  it("throws when the edge function responds with an error object", async () => {
    const invokeMock = vi.fn().mockResolvedValue({ data: null, error: new Error("Bad invite") });
    const supabaseMock = { functions: { invoke: invokeMock } } as unknown as Parameters<typeof signupWithInvite>[0];
    const form: SignupForm = {
      email: "user@example.com",
      password: "secret",
      invite_code: "CODE",
      desired_alias: "Alias"
    };

    await expect(signupWithInvite(supabaseMock, form)).rejects.toThrow("Bad invite");
  });

  it("throws when the response indicates the signup failed", async () => {
    const invokeMock = vi.fn().mockResolvedValue({ data: { ok: false, error: "Invite invalid" }, error: null });
    const supabaseMock = { functions: { invoke: invokeMock } } as unknown as Parameters<typeof signupWithInvite>[0];

    await expect(
      signupWithInvite(supabaseMock, {
        email: "user@example.com",
        password: "secret",
        invite_code: "CODE",
        desired_alias: "Alias"
      })
    ).rejects.toThrow("Invite invalid");
  });
});

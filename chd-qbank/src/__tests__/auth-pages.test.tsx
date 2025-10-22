import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/utils";
import Login from "../pages/Login";
import Signup from "../pages/Signup";

vi.mock("../lib/supabaseClient", () => {
  const auth = {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(async () => ({ data: { session: null } }))
  };
  return {
    supabase: {
      auth,
      functions: {
        invoke: vi.fn()
      }
    }
  };
});

describe("authentication pages", () => {
  it("renders the login form with navigation link", () => {
    const html = renderWithRouter(<Login />);
    expect(html).toContain("Welcome back");
    expect(html).toContain("type=\"email\"");
    expect(html).toContain("type=\"password\"");
    expect(html).toContain("Sign in");
    expect(html).toContain("href=\"/signup\"");
  });

  it("renders the signup form with invite and alias fields", () => {
    const html = renderWithRouter(<Signup />);
    expect(html).toContain("Join CHD QBank");
    expect(html).toContain("Request access");
    expect(html).toContain("Invite code");
    expect(html).toContain("Preferred alias (optional)");
    expect(html).toContain("placeholder=\"Brisk-Sparrow-417\"");
    expect(html).toContain("href=\"/login\"");
  });
});

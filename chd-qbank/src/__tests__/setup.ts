import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "http://localhost";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "test-anon-key";

globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

afterEach(() => {
  cleanup();
});

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, vi } from "vitest";

const defaultSupabaseUrl = "http://localhost:54321";
const defaultSupabaseAnonKey = "test-anon-key";

vi.stubEnv("VITE_SUPABASE_URL", defaultSupabaseUrl);
vi.stubEnv("VITE_SUPABASE_ANON_KEY", defaultSupabaseAnonKey);
vi.stubEnv("SUPABASE_URL", defaultSupabaseUrl);
vi.stubEnv("SUPABASE_ANON_KEY", defaultSupabaseAnonKey);

process.env.VITE_SUPABASE_URL ||= defaultSupabaseUrl;
process.env.VITE_SUPABASE_ANON_KEY ||= defaultSupabaseAnonKey;
process.env.SUPABASE_URL ||= defaultSupabaseUrl;
process.env.SUPABASE_ANON_KEY ||= defaultSupabaseAnonKey;

afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

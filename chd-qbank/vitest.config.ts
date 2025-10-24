import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    environment: "node",
    environmentMatchGlobs: [["src/__tests__/**/*.test.tsx", "jsdom"]],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});

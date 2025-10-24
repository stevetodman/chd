import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "tests/**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    setupFiles: "./src/__tests__/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@axe-core/react": fileURLToPath(
        new URL("./vendor/@axe-core/react/index.js", import.meta.url),
      ),
      "axe-core": fileURLToPath(new URL("./vendor/axe-core/index.js", import.meta.url)),
      "jest-axe": fileURLToPath(new URL("./vendor/jest-axe/index.js", import.meta.url)),
    },
  },
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
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});

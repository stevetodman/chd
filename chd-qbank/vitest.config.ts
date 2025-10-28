import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const coverageEnabled = process.env.VITEST_ENABLE_COVERAGE === "true";

const coverageConfig = coverageEnabled
  ? {
      provider: "v8" as const,
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    }
  : {
      enabled: false,
      provider: "v8" as const,
    };

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
    coverage: coverageConfig,
  },
});

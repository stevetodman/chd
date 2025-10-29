import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const buildHash =
    process.env.BUILD_HASH ??
    createHash("sha256").update(`${mode}-${Date.now()}`).digest("hex").slice(0, 12);

  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  const appVersion = pkg.version ?? "0.0.0";

  return {
    plugins: [react()],
    envPrefix: "VITE_",
    define: {
      __BUILD_HASH__: JSON.stringify(buildHash),
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    server: { port: 5173 },
    build: { sourcemap: mode !== "production" },
    test: {
      environment: "jsdom",
      setupFiles: "./src/__tests__/setup.ts",
      include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
      exclude: ["tests/e2e/**"]
    }
  };
});

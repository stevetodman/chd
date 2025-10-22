import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const buildHash =
    process.env.BUILD_HASH ??
    createHash("sha256").update(`${mode}-${Date.now()}`).digest("hex").slice(0, 12);

  return {
    plugins: [react()],
    define: {
      __BUILD_HASH__: JSON.stringify(buildHash)
    },
    server: {
      port: 5173
    },
    build: {
      sourcemap: mode !== "production"
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/__tests__/setup.ts"
    }
  };
});

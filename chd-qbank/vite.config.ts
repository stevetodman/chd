import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const enableSourceMaps =
  process.env.BUILD_SOURCEMAPS === "true" || process.env.VITE_SOURCEMAPS === "true";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    sourcemap: enableSourceMaps
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/__tests__/setup.ts"
  }
});

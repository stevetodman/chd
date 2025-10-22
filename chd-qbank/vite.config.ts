import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
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
}));

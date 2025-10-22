import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    sourcemap: true
  },
  test: {
    environment: "node",
    setupFiles: "./src/__tests__/setup.ts",
    clearMocks: true
  }
});

import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5faff",
          500: "#2563eb",
          600: "#1d4ed8"
        }
      },
      maxWidth: {
        prose: "780px"
      }
    }
  },
  plugins: [typography]
};

export default config;

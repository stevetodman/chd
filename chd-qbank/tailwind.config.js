/* eslint-disable @typescript-eslint/no-require-imports */
const defaultTheme = require("tailwindcss/defaultTheme");
const typography = require("@tailwindcss/typography");

/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          25: "#f8fbff",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554"
        },
        accent: {
          50: "#fdf2ff",
          100: "#fbe6ff",
          200: "#f5c8ff",
          300: "#eaa6ff",
          400: "#d574ff",
          500: "#b344ff",
          600: "#9620ff",
          700: "#7a0fd8",
          800: "#5f0ca9",
          900: "#430878"
        },
        surface: {
          base: "#ffffff",
          subtle: "#f8fafc",
          muted: "#eff4fb",
          inverted: "#0f172a"
        },
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b"
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f"
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d"
        }
      },
      spacing: {
        3.5: "0.875rem",
        4.5: "1.125rem",
        5.5: "1.375rem",
        6.5: "1.625rem",
        7.5: "1.875rem",
        18: "4.5rem"
      },
      fontFamily: {
        sans: ["'InterVariable'", "'Inter'", ...defaultTheme.fontFamily.sans]
      },
      fontSize: {
        "label-xs": ["0.7rem", { lineHeight: "1rem", letterSpacing: "0.16em", fontWeight: "600" }],
        "body-sm": ["0.9rem", { lineHeight: "1.5" }],
        "body-md": ["1.05rem", { lineHeight: "1.6" }],
        "display-sm": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "display-md": ["1.875rem", { lineHeight: "1.25", fontWeight: "600" }]
      },
      boxShadow: {
        "elevation-xs": "0 1px 2px rgba(15, 23, 42, 0.08)",
        "elevation-sm": "0 2px 6px rgba(15, 23, 42, 0.12)",
        "elevation-md": "0 12px 30px rgba(15, 23, 42, 0.16)",
        "focus-ring": "0 0 0 4px rgba(37, 99, 235, 0.16)"
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem"
      },
      maxWidth: {
        prose: "780px"
      }
    }
  },
  plugins: [typography]
};

module.exports = config;

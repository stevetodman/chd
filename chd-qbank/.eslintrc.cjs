module.exports = {
  root: true,
  ignorePatterns: [
    "dist",
    "build",
    "coverage",
    "node_modules",
    "scripts/**",
    "tests/**",
    "vendor/**",
    "supabase/**",
    "eslint-plugin-jsx-a11y/**",
    "tailwind.config.*",
    "postcss.config.js"
  ],
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: ["react", "react-hooks", "@typescript-eslint", "jsx-a11y"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react-hooks/set-state-in-effect": "off",
    "jsx-a11y/button-has-accessible-name": "off",
    "no-constant-binary-expression": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-require-imports": "off"
  }
};

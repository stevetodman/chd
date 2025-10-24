module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['node_modules/', 'vendor/', 'scripts/dist/'],
  overrides: [
    {
      files: ['scripts/**/*.{ts,tsx}'],
      env: {
        node: true,
      },
      parserOptions: {
        project: './tsconfig.scripts.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['supabase/functions/**/*.{ts,tsx}'],
      globals: {
        Deno: 'readonly',
      },
    },
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
};

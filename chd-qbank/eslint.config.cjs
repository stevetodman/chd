const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const globals = require('globals');

const tsFlatRecommended = tseslint.configs['flat/recommended'].map((config) => {
  const files = config.files ?? ['**/*.{ts,tsx,mts,cts}'];
  const languageOptions = config.languageOptions
    ? {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          ecmaFeatures: {
            ...(config.languageOptions.parserOptions?.ecmaFeatures ?? {}),
            jsx: true
          }
        }
      }
    : {
        parser: tsParser,
        parserOptions: {
          ecmaFeatures: { jsx: true }
        }
      };

  return {
    ...config,
    files,
    languageOptions
  };
});

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    }
  },
  js.configs.recommended,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  ...tsFlatRecommended
];

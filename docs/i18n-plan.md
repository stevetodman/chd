# Internationalization Plan

This document outlines the approach for introducing internationalization to the CHD QBank application.

## Translation file structure

* Translations will live under `chd-qbank/public/locales/` organized by language code (`en`, `es`, etc.).
* Each language directory will store one JSON file per namespace. The initial extractor writes to `public/locales/en.json`; as feature work progresses we can expand to namespaced files (for example `public/locales/en/common.json`).
* Keys are generated automatically by the extraction script based on file paths and content to ensure uniqueness. They can be edited by hand when we replace hard-coded text with translation lookups.

## Extraction workflow

1. Run `npm run i18n:extract` from the `chd-qbank` workspace.
2. The script compiles TypeScript utilities (`npm run build:scripts`) and then scans all `.ts` and `.tsx` files under `src/` for hard-coded strings.
3. Extracted strings are written to `public/locales/en.json` and printed to the console so developers can review new keys.
4. Developers should commit the updated JSON file alongside any components that introduce new copy.

## Managing translations

* The `en.json` file will act as the source of truth for translators. Additional locale files (for example `public/locales/es.json`) will mirror the key structure and contain translated values.
* We will integrate a translation management service (such as Lokalise or Phrase) to coordinate contributors and keep locale files synchronized. Until then, translations can be maintained manually in version control.
* Keys should remain stable; when copy changes, update the value while retaining the key to minimize translator churn.

## Loading translations at runtime

* Future implementation work will add an i18n library (e.g., `react-i18next`) to the React application.
* During application bootstrap we will load the JSON file that matches the user's locale. For static hosting, Vite can statically serve the `public/locales` assets, allowing the app to fetch the appropriate file.
* We will memoize translation dictionaries in client state and provide React context/hooks for components.
* Locale detection will default to English while providing a language switcher to let users select an available translation.

## Next steps

1. Replace hard-coded strings in components with translation lookups using the generated keys.
2. Add automated checks to ensure `i18n:extract` runs (or translation files are updated) as part of pull requests that modify UI copy.
3. Integrate continuous localization tooling once multiple languages are supported.

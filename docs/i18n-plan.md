# Internationalization Plan

This project introduces an automated extraction script that collects user-facing strings from the TypeScript and TSX source files and writes them to `public/locales/en.json`. The plan below outlines how translation files will be generated, reviewed, and maintained.

## Source of Truth

- `public/locales/en.json` is the canonical catalog for strings gathered from the codebase.
- Strings are discovered by running `npm run i18n:extract`, which parses `.ts` and `.tsx` files with Babel and stores every detected literal string (excluding module specifiers and similar technical values).
- The English catalog stores each entry as `"original": "original"` so that new keys are human-readable.

## Extraction Workflow

1. Run `npm install` to ensure development dependencies (including Babel, fast-glob, and ts-node) are available.
2. Execute `npm run i18n:extract` after adding or changing user-facing text.
3. Inspect `public/locales/en.json` in the diff to verify that only the expected phrases were added or modified.
4. Commit the updated catalog alongside the corresponding code changes.

## Managing Additional Locales

- Locale files live alongside the English catalog under `public/locales/<language>.json`.
- Translators should copy `en.json` to a new locale file (for example, `public/locales/es.json`) and translate the values while keeping the keys intact.
- Each locale file must remain sorted alphabetically to simplify diffs; contributors can rely on JSON formatting tools to maintain ordering.

## Continuous Maintenance

- Run the extraction script regularly to surface newly added literals.
- Remove obsolete entries manually when code paths are deleted—`npm run i18n:extract` will no longer emit them once the string is gone from the source.
- During code review, ensure that any new user-facing strings appear in `en.json` and that translated locale files stay in sync with the English catalog.

## Future Enhancements

- Integrate the extraction script into CI to prevent merges that introduce untranslated text.
- Extend the script to generate a machine-readable report of unused keys, allowing automated pruning of stale translations.
- Add support for descriptive keys (e.g., `"dashboard.welcome"`) by layering a manual mapping over the extracted strings if the team chooses to transition away from using the literal text as the key.

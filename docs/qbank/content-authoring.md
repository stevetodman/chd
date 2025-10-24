# QBank Content Authoring Guide

This guide explains how to create, review, and ship new congenital heart disease questions for the CHD Tutor platform. It covers the JSON schema used by automation scripts, how rich media is bundled, and the validation commands that keep the database aligned with source control.

## Prerequisites

Before authoring content you should:

- Install project dependencies and configure Supabase credentials as described in the [README](../../README.md#environment-variables).
- Review existing questions in [`chd-qbank/data/templates/questions.full.template.json`](../../chd-qbank/data/templates/questions.full.template.json) to understand tone and formatting expectations.
- Ensure you have Supabase service-role credentials configured locally so the seeding commands can upsert data.

## Question JSON structure

Questions are stored as JSON objects inside `chd-qbank/data/templates/questions.full.template.json`. Each object maps to a row in the `questions` table plus related records (`choices`, `media_bundles`, `context_panels`). The automation scripts consume the fields listed below:

| Field | Required | Description |
| --- | --- | --- |
| `slug` | ✅ | Unique, URL-safe identifier. Doubles as the primary key when syncing content. |
| `stem_md` | ✅ | Markdown-formatted question stem. Supports bold/italic, lists, and inline code. |
| `lead_in` | ➖ | Short prompt that follows the stem (e.g., "Which of the following …?"). |
| `choiceA`–`choiceE` | ✅ (A–D) | Markdown answers. Provide at least four options; leave `choiceE` empty for four-option items. |
| `correct_label` | ✅ | Uppercase letter (`A`–`E`) matching the right answer. |
| `explanation_brief_md` | ✅ | High-yield summary (1–2 sentences) explaining the answer. |
| `explanation_deep_md` | ✅ | Detailed teaching explanation. Can include Markdown formatting. |
| `topic`, `subtopic`, `lesion` | ➖ | Taxonomy metadata used for filtering and analytics. |
| `difficulty` | ➖ | Integer from 1 (easiest) to 5 (hardest). Stored as `difficulty_target` in the database. |
| `bloom` | ➖ | Bloom's taxonomy tag (e.g., `remembering`, `analysis`). |
| `lecture_link` | ➖ | Free-form reference to modules or slide decks. |
| `media_*` fields | ➖ | URLs for associated media (see [Media bundles](#media-bundles)). |
| `alt_text` | ➖ | Required whenever a media asset is provided for accessibility. |
| `status` | ✅ | `draft`, `published`, or `archived`. Controls visibility in the app. |

> **Tip:** Automation scripts normalize Markdown before persisting to Supabase. Keep lines under ~120 characters and avoid trailing whitespace so diffs stay readable.

## Media bundles

Media assets (CXR images, murmurs, diagrams, EKGs) are grouped into media bundles defined in [`scripts/seed/seedData.ts`](../../chd-qbank/scripts/seed/seedData.ts). Each bundle maps to one or more questions via the `mediaBundleId` field. To add a new asset:

1. Upload the media to your CDN or Supabase storage bucket and capture the public URL.
2. Add an entry to the `MEDIA_BUNDLES` array with a deterministic UUID (generate one with `uuidgen`). Provide `alt_text` for every non-audio asset.
3. Reference the bundle ID from your question JSON (`mediaBundleId`) and remove any unused `media_*` URLs from the legacy template fields.

The seeding script backfills `media_bundles` rows and attaches them to questions so the frontend can load assets consistently.

## Context panels and labs

Complex questions may require supporting data such as lab values or formulas. Add contextual panels using the `context_panels` property described in [`QuestionSeed`](../../chd-qbank/scripts/seed/seedData.ts#L27-L44):

- `labs` panels render tabular results. Provide an `id`, optional `title`, and an array of `{ label, value, unit }` entries.
- `formula` panels display derived equations or markdown callouts with optional `formulas` metadata.

Panels are optional; omit the property if the stem does not need additional scaffolding.

## Workflow for adding a question

1. **Duplicate an existing entry** in `questions.full.template.json` and update the fields listed above. Stick to Markdown for formatting—HTML is stripped during ingestion.
2. **Attach or create a media bundle** if the item references audio, imaging, or diagrams. Update the `mediaBundleId` and ensure `alt_text` is present.
3. **Validate JSON formatting** by running `npm run format` (if enabled) or opening the file in an editor with JSON linting. The seeding script reads the file as structured data; syntax errors will halt ingestion.
4. **Sync to Supabase** using `npm run seed:full`. The script updates `questions`, `choices`, `media_bundles`, context panels, and related game assets in a single run.
5. **Verify alignment** with `npm run verify:seed` to ensure the database mirrors the templates without diffs. This command is safe to run in staging and production with read-only service role credentials.
6. **Preview in the UI** by launching `npm run dev` and opening a practice session under an instructor account. Confirm media renders correctly and explanations display as expected.
7. **Commit the changes** including updated templates and any new media bundle definitions.

## Game content

The same seeding pipeline manages the murmur and chest X-ray training games:

- `murmur_items` and `murmur_options` are populated from the `MURMUR_ITEMS` arrays in [`seedData.ts`](../../chd-qbank/scripts/seed/seedData.ts).
- `cxr_items` and `cxr_labels` define bounding-box targets for the radiology drill. Coordinate units are percentages (0–1) stored as floats.

Update these arrays when introducing new cases and run `npm run seed:full` to refresh Supabase.

## Review checklist

Before opening a pull request:

- [ ] Every question has a unique `slug` and `status` of `published` or `draft` as appropriate.
- [ ] Media URLs are HTTPS, reachable, and include descriptive `alt_text`.
- [ ] Explanations cite relevant physiology and management steps without PHI.
- [ ] `npm run seed:full` and `npm run verify:seed` run without errors in your environment.
- [ ] UI review confirms the item renders correctly on desktop and mobile breakpoints.

Following this checklist keeps the QBank consistent and ensures automated deployments remain deterministic.

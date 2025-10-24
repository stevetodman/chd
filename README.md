# CHD – Congenital Heart Disease Tutor Platform

This monorepo packages everything required to operate the **CHD QBank**: a congenital heart disease learning platform that combines a Step 1–style question bank, imaging and auscultation games, scheduled jobs, and accompanying automation. The primary web client is a Vite + React single-page application backed by Supabase for authentication, data storage, role-based access, and analytics. SQL migrations, operational scripts, documentation, and instructional design prompts live alongside the app so new contributors can bootstrap the full environment quickly.

## Table of contents

- [Repository layout](#repository-layout)
- [Key capabilities](#key-capabilities)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Usage guide](#usage-guide)
- [Supabase & data model](#supabase--data-model)
- [Automation scripts](#automation-scripts)
- [Environment variables](#environment-variables)
- [Testing expectations](#testing-expectations)
- [Development workflow](#development-workflow)
- [Deployment](#deployment)
- [Security & compliance](#security--compliance)
- [Additional documentation](#additional-documentation)
- [License](#license)

## Repository layout

| Path | Description |
| --- | --- |
| `chd-qbank/` | Frontend source, Supabase assets, automation scripts, and test suites. |
| `chd-qbank/schema.sql`, `storage-policies.sql`, `cron.sql` | Canonical SQL definitions for core tables, Row Level Security, and scheduled jobs executed during bootstrap. |
| `chd-qbank/data/` | Seed templates, including question and media fixtures consumed by automation scripts. |
| `chd-qbank/supabase/` | Edge Functions and migration helpers that run inside Supabase. |
| `docs/` | Operational runbooks spanning analytics, runtime behavior, security, and retention. |
| `prompts/` | Prompt scaffolds used when authoring new clinical content. |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md` | Contributor onboarding, reporting guidance, and high-level overview documents. |

## Key capabilities

- **Invite-only access** enforced through the `signup-with-code` Edge Function and `app_settings` configuration.
- **RLS-first schema** that stores question bank content, player telemetry, and media bundles while guarding sensitive data with Supabase Row Level Security policies.
- **Practice analytics** powered by materialized views (`analytics_heatmap_agg`) and verification scripts for proactive performance checks.
- **Learning games** (CXR bounding box drills and murmur classification) that reuse the shared content library and aggregate gameplay results for leaderboards.
- **Automation suite** covering migration safety, bulk seeding, verification tasks, and synthetic data refreshes to keep environments aligned.

## Prerequisites

- **Node.js 18+**
- **npm 9+**
- Access to a **Supabase** project (separate development and production projects are recommended)
- Service-role credentials for automation tasks (kept out of version control)

## Quick start

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/<your-org>/chd.git
   cd chd/chd-qbank
   npm install
   ```

2. Copy `.env.example` to `.env` and populate Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). If you plan to run automation scripts locally, also set service-role variables (see [Environment variables](#environment-variables)).

3. Start the development server:

   ```bash
  npm run dev
  ```

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with an invited account. Initial content can be loaded by running the seeding scripts after your database is provisioned.

## Usage guide

### Signing in and roles

- Deploy the [`signup-with-code` Edge Function](./chd-qbank/supabase/functions/signup-with-code) and populate the `app_settings` table with a valid invite code (see [`npm run seed:invite`](#automation-scripts)).
- Learners sign up via email/password. Instructors and admins receive elevated roles through the `app_roles` table and can unlock analytics dashboards, content review tools, and seeding utilities.
- Use Supabase Auth to manage password resets; role assignments sync automatically through the `handle_new_user` trigger in [`schema.sql`](./chd-qbank/schema.sql).

### Practicing questions

1. Navigate to **Practice** → **Question Bank**.
2. Filter by lesion, topic, Bloom level, or difficulty. Taxonomy facets are sourced from the metadata in `questions.full.template.json`.
3. Start a session to see one question at a time. Explanations surface after you submit an answer—brief summaries lead, followed by the detailed teaching block.
4. Completed sessions populate the `responses` and `answer_events` tables. Analytics widgets refresh automatically once the [`analytics_heatmap_agg`](./docs/analytics/heatmap.md) materialized view is updated via cron or `npm run verify:analytics:heatmap`.

### Reviewing analytics

- Instructor roles can open the **Insights** area to review cohort progress, heatmaps, and reliability calculations sourced from `assessment_reliability`.
- Download CSV exports from the analytics dashboards when you need to perform offline analysis. The exports mirror the views documented in [`docs/analytics`](./docs/analytics).
- Scheduled jobs defined in [`cron.sql`](./chd-qbank/cron.sql) keep materialized views fresh; run them manually after large content imports to avoid stale charts.

### Gameplay drills

- **Murmur lab:** Launch from **Games** → **Murmurs** to classify audio clips stored in `media_bundles.murmur_url`. Attempts and leaderboard progress persist via the `murmur_attempts` and `leaderboard_events` tables.
- **Chest X-ray labeling:** Start from **Games** → **CXR Trainer**. Bounding boxes come from `cxr_labels`; accuracy and timing metrics land in `cxr_attempts` for analytics review.
- Game assets reuse the same seeding pipeline as question content. Updating the templates ensures instructors and learners see consistent scenarios across practice modes.

## Supabase & data model

The application relies on a Postgres schema defined in [`chd-qbank/schema.sql`](./chd-qbank/schema.sql). Bootstrap a new project by running the schema, storage policy, and cron SQL files inside the Supabase SQL editor (or through the CLI). Once the schema exists you can seed representative content with `npm run seed:full` and keep invite codes synchronized via `npm run seed:invite`.

### Core tables

| Table | Purpose |
| --- | --- |
| `app.app_settings` | Singleton configuration row controlling invite codes, retention windows, and feature toggles. Updated via `npm run seed:invite` and audited by `app.app_settings_audit`. |
| `app_users` | Mirrors `auth.users` with display preferences, consent flags, and role metadata. The `handle_new_user` trigger keeps it synchronized. |
| `questions` | Stores Markdown stems, difficulty targets, taxonomy tags, and `media_bundle_id` references. |
| `choices` | Linked to `questions` with one row per answer option; the `sync_correct_choice` trigger keeps `questions.correct_choice_label` aligned. |
| `media_bundles` | Groups murmur audio, CXR images, diagrams, and accessibility `alt_text` for reuse across questions and games. |
| `responses` & `answer_events` | Capture practice activity, timing, and confidence values for downstream analytics. `log_answer_event()` mirrors responses into `answer_events`.
| `practice_sessions` | Tracks a learner's interaction with the bank, including start/end timestamps and assignment metadata.
| `murmur_items`/`murmur_options` | Define auscultation drills: each item references a media bundle and the expected auscultatory finding. |
| `cxr_items`/`cxr_labels` | Describe radiology training cases and bounding boxes. |
| `assessment_reliability` & `leaderboard` | Aggregated views powering cohort analytics and gamification features. |
| `public_aliases` | Allows learners to opt into a public leaderboard identity without exposing email addresses. |

### Functions, views, and APIs

- **Triggers:** `log_answer_event`, `sync_public_alias`, and `set_updated_at` maintain audit trails and derived fields without manual bookkeeping.
- **Analytics:** The `analytics_heatmap_agg` materialized view and supporting `analytics_refresh_heatmap()` function feed heatmap dashboards. See [`docs/analytics/heatmap.md`](./docs/analytics/heatmap.md) for refresh guidance.
- **Edge functions:** [`signup-with-code`](./chd-qbank/supabase/functions/signup-with-code/index.ts) enforces invite-only registration. It validates codes stored in `app.app_settings` and provisions role assignments during sign-up.
- **Security helpers:** `is_admin()` and `leaderboard_is_enabled()` consolidate role checks for the frontend and automation scripts.

## Automation scripts

All commands below run from `chd-qbank/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Launch the Vite development server on [http://localhost:5173](http://localhost:5173). |
| `npm run build` | Produce an optimized production bundle in `dist/`. |
| `npm run preview` | Serve the built assets locally for smoke testing. |
| `npm run lint` | Run ESLint on the TypeScript/React source tree. |
| `npm run test` | Execute the Vitest suite (unit tests plus utilities). |
| `npm run build:scripts` | Compile TypeScript automation utilities located in `scripts/`. |
| `npm run notice` | Regenerate the `NOTICE` file and JSON license inventory from installed dependencies. |
| `npm run check:migration-safety` | Scan `supabase/migrations` for unsafe operations (non-concurrent indexes, destructive drops, etc.). |
| `npm run seed:invite` | Upsert invite-code configuration in `app_settings` using service-role credentials. |
| `npm run seed:full` | Synchronize questions, games, and media bundles from `data/templates` into Supabase. |
| `npm run verify:seed` | Validate that the current database matches seed expectations without mutating data. |
| `npm run verify:analytics:heatmap` | Run the synthetic-data harness that refreshes and validates `analytics_heatmap_agg`. |

## Environment variables

Create `chd-qbank/.env` with the variables required for your workflow:

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Automation scripts (service role credentials never ship to the client bundle)
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
INVITE_CODE=<optional-invite-code>
INVITE_EXPIRES=<optional-iso-date>
```

The automation helpers load `.env` automatically. Invite codes are only written to the `app_settings` table via `npm run seed:invite`—do **not** expose them through Vite environment variables. When deploying Edge Functions, configure their environment variables separately inside Supabase.

## Testing expectations

- Run `npm run lint` and `npm run test` before submitting feature or bug-fix pull requests.
- The `tests/e2e` directory contains Vitest-powered UI flows (murmur drills, CXR labeling, onboarding) that rely on seeded content. Keep them in sync with seed templates when updating gameplay logic.
- Document executed commands in your pull request; documentation-only updates can reference the exemption in the PR template.

## Development workflow

1. Branch from `main` and install dependencies.
2. Implement changes in focused commits. Update SQL migrations and automation scripts when altering data models or Supabase behavior.
3. Run the required lint/test commands for code changes.
4. Update documentation to reflect user-facing or operational differences.
5. Open a pull request describing the change, attaching screenshots for UI modifications when possible.
6. Address review feedback promptly and keep scope tight—open draft pull requests if work is still in progress.

## Deployment

1. Build static assets (`npm run build`) and deploy them to a static host such as Vercel (Hobby tier works for previews).
2. Point preview deployments at the development Supabase project; production deployments should target Supabase Pro to unlock `pg_cron`.
3. Run `npm run seed:invite` after rotating invite codes or service-role keys.
4. Refresh analytics materialized views (`select analytics_refresh_heatmap();`) post-deployment to keep dashboards current.

## Security & compliance

- Sensitive migrations (auth, RLS, analytics) require an additional reviewer and may necessitate credential rotation. Consult [`SECURITY.md`](./SECURITY.md) for disclosure contacts and processes.
- Admin access is granted via the `app_roles` table. For detailed grant/revoke/audit procedures see [`docs/security/admin-roles.md`](./docs/security/admin-roles.md).
- Event retention automation and service worker operations are documented in [`docs/ops/event-retention.md`](./docs/ops/event-retention.md) and [`docs/runtime/service-worker.md`](./docs/runtime/service-worker.md).
- License inventory and the root `NOTICE` file are regenerated automatically in CI using `npm run notice`; commit updated artifacts when dependencies change.

## Additional documentation

- QBank authoring workflow: [`docs/qbank/content-authoring.md`](./docs/qbank/content-authoring.md)
- Analytics heatmap operations: [`docs/analytics/heatmap.md`](./docs/analytics/heatmap.md)
- Event retention jobs: [`docs/ops/event-retention.md`](./docs/ops/event-retention.md)
- Service worker behavior: [`docs/runtime/service-worker.md`](./docs/runtime/service-worker.md)
- Admin role management: [`docs/security/admin-roles.md`](./docs/security/admin-roles.md)
- Security disclosures and response process: [`SECURITY.md`](./SECURITY.md)

## License

This project is licensed under the [MIT License](./LICENSE).

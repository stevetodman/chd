# CHD – Congenital Heart Disease Tutor Platform

This repository hosts the code and infrastructure assets for the **CHD QBank**—a congenital heart disease learning platform that combines a Step 1–style question bank with teaching games for cardiology trainees. The project is structured as a Vite + React single page application backed by Supabase for authentication, data storage, analytics, and scheduled jobs. Everything needed to stand up the product (schema, automation scripts, prompt scaffolds, and documentation) lives in this monorepo so new contributors can get productive quickly.

## Quick Links

- [Getting Started](#quick-start)
- [Architecture Overview](#architecture)
- [Database Schema](#data-model)
- [Supabase Configuration](#supabase-setup)
- [Development Workflow](#development-workflow)
- [Security & Compliance](#security--compliance)

## Project Status

- **Overall progress:** ~80% complete. Core learning flows, analytics, and Supabase integrations are in place, but automated QA, offline readiness, and operational tooling still need to be productionized.

### Completed Milestones

- **End-to-end learner flows** for question practice, review, murmur identification, and CXR pattern matching that record attempts, award leaderboard points, and surface media/context from Supabase.
- **Admin tooling** covering item lists, an editor, CSV importer, analytics dashboards, and feature toggles wired to RPC helpers and scheduled refresh routines.
- **Supabase backend** with RLS-secured schemas, nightly stats refresh via `pg_cron`, invite-only onboarding, and a service-role Edge Function that mints aliases during signup.

### Gaps & Risks

- **Testing debt:** Only a smoke-level unit test exists; critical client flows, Supabase RPC contracts, and access controls lack automated coverage.
- **Offline and resilience gaps:** The service worker is still a stub with no asset/runtime caching or background sync, keeping the app network-dependent.
- **Operational readiness:** No telemetry, CI pipelines, or seeded analytics dashboards are configured beyond local scripts, leaving production monitoring and migration automation to be defined.

## Repository Layout

| Path | Description |
| --- | --- |
| `chd-qbank/` | The primary web application, including frontend source code, configuration, and Supabase assets. |
| `schema.sql`, `storage-policies.sql`, `cron.sql` | Supabase SQL migrations for database schema, storage rules, and scheduled tasks. |
| `import_template.csv` | CSV scaffold for bulk question imports. |
| `docs/` | Deep dives on analytics, security, and operational procedures. |
| `prompts/` | Reusable product prompts that guide instructional design work. |

## Features

- Invite-only Supabase authentication powered by an Edge Function.
- Modular question bank with analytics and item-management tooling.
- Learning games that reuse the shared content library and question metadata.
- Fully RLS-protected Postgres schema with storage buckets for media (murmurs, CXR, EKG, diagrams).
- Analytics views and scripts that help calibrate difficulty and distractor quality.
- Static-first deployment strategy suitable for Vercel hosting.

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- A **Supabase** project for both development and production environments.

## Quick Start

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/<your-org>/chd.git
   cd chd/chd-qbank
   npm install
   ```

2. Copy `.env.example` to `.env` and provide the Supabase project URL and anon key before starting the development server.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with an account invited through Supabase.

If you need a database snapshot for local prototyping, run the SQL migrations in Supabase and seed a few questions using `import_template.csv` or the admin UI.

## Architecture

- **Frontend framework:** Vite-powered React with TypeScript. Shared styling comes from Tailwind CSS with Radix UI primitives for dialogs, dropdowns, and toasts.
- **State & data layer:** Supabase JS client handles auth and CRUD operations against Postgres. Client state for the current session and feature-specific stores live in [Zustand](./chd-qbank/src/lib/auth.ts) slices, while derived utilities (pagination, shuffling, normalization) are colocated under `src/lib`.
- **Routing & layout:** React Router defines top-level routes inside `src/pages`. Each page composes leaf components from `src/components` (presentation/UI) and `src/components/ui` (primitive controls) to keep view logic modular.
- **Supabase assets:** SQL migrations (`schema.sql`, `storage-policies.sql`, `cron.sql`) and Edge Functions in `supabase/functions` configure the backend schema, RLS rules, and invitation workflow.
- **Automation:** Lightweight Node scripts in `chd-qbank/scripts` seed settings like invite codes, verify analytics, and refresh RLS policies. GitHub workflows are currently managed manually but can be adapted to your CI provider.

## Data Model

The Supabase Postgres schema models both the question bank and the auxiliary teaching games:

- **app_users / auth.users:** Mirrors Supabase auth profiles and stores roles (`student`, `admin`), display aliases, and moderation flags.
- **app_settings:** Key/value configuration store consumed by Edge Functions (e.g., `invite_code`, `leaderboard_enabled`).
- **media_bundles:** Optional media assets (murmur audio, chest X-ray, EKG, diagrams) linked to questions.
- **questions & choices:** Versioned question stems with Markdown explanations and multiple-choice distractors. `choices` enforce a single correct answer and cascade deletes with their parent question.
- **responses:** Learner submissions, including timing, correctness, and flag state. Unique per user/question with RLS protections.
- **item_stats / distractor_stats:** Aggregate analytics supporting difficulty calibration and distractor performance monitoring.
- **leaderboard & public_aliases:** Track points earned by correctly answering practice questions and optionally expose anonymized aliases.
- **Murmur & CXR tables:** Separate item banks (`murmur_items`, `murmur_options`, `cxr_items`, `cxr_labels`) plus attempt tables capture gameplay for auscultation and imaging drills.

See [`chd-qbank/schema.sql`](./chd-qbank/schema.sql) for column-level details and constraints.

## Available Scripts

All commands are executed from the `chd-qbank` directory.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on [http://localhost:5173](http://localhost:5173). |
| `npm run build` | Produce an optimized production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint on the TypeScript/React source files. |
| `npm run test` | Execute the Vitest unit test suite (placeholder coverage). |
| `npm run seed:invite` | Seed or update invite-code settings in Supabase (`app_settings` table). |

## Supabase Setup

1. Create Supabase projects for development and production.
2. Run `schema.sql`, `storage-policies.sql`, and `cron.sql` in the Supabase SQL editor.
3. Deploy the `signup-with-code` Edge Function contained in `supabase/functions/signup-with-code` and configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables for the function.
4. Create storage buckets named `murmurs`, `cxr`, `ekg`, and `diagrams`.
5. Configure SMTP (e.g., Resend) inside Supabase; no client key is required.
6. Review `docs/analytics/heatmap.md` for materialized views and refresh routines that require elevated service-role access.

## Environment Variables

Create an `.env` file in `chd-qbank/` with the following values:

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Additional secrets (such as service role keys) should be stored securely and provided only to server-side contexts like Edge Functions.

The `npm run seed:invite` script reads extra environment variables (via `.env`) to update Supabase settings:

```bash
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
INVITE_CODE=<invite-code-to-issue>
INVITE_EXPIRES=<yyyy-mm-dd>
```

Run the script from `chd-qbank/` after provisioning the database to keep invite codes in sync across environments.

## Development Workflow

1. Branch from `main` and ensure dependencies are installed.
2. Make changes within `chd-qbank/src` and associated Supabase SQL files.
3. Run `npm run lint` and `npm run test` before committing feature or bugfix changes.
4. Format documentation updates manually (no automated formatter is provided). When editing Markdown, prefer semantic headings and keep line lengths under ~120 characters for readability.
5. Open a pull request describing the change and include screenshots for UI adjustments when possible.
6. Respond to reviewer feedback promptly and keep PRs focused—use draft pull requests for in-progress work.

## Deployment

1. Deploy the static assets to Vercel (Hobby tier is sufficient for previews).
2. Configure preview deployments to point to the development Supabase project.
3. Promote builds to production once Supabase Pro features (such as `pg_cron`) are available.
4. Rotate invite codes and service keys whenever you change environments; automation scripts in `chd-qbank/scripts` help keep settings in sync.

## Contributing

Contributions are welcome! Please open an issue before submitting major features or architecture changes. Bugfix pull requests should include reproduction steps, screenshots (for UI changes), and tests when applicable. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for detailed expectations and the review checklist.

## Security & Compliance

Security-sensitive changes (authentication, RLS, analytics functions) require an additional reviewer and may necessitate a Supabase service-role key rotation. Refer to [`SECURITY.md`](./SECURITY.md) for disclosure guidelines and contact information.

## Future Work

- Expand automated testing coverage beyond the placeholder Vitest suite to ensure the question bank and game flows behave reliably.
- Prototype richer game interactions that deepen clinical reasoning practice while reusing the shared content library.
- Harden offline capabilities so the learning experience remains functional with intermittent connectivity.

## License

This project is licensed under the terms of the [MIT License](./LICENSE).

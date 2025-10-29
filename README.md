# CHD – Congenital Heart Disease Tutor Platform

This monorepo packages everything required to operate the **CHD QBank**: a congenital heart disease learning platform that combines a Step 1–style question bank, imaging and auscultation games, scheduled jobs, and accompanying automation. The primary web client is a Vite + React single-page application backed by Supabase for authentication, data storage, role-based access, and analytics. SQL migrations, operational scripts, documentation, and instructional design prompts live alongside the app so new contributors can bootstrap the full environment quickly.

## Table of contents

- [Repository layout](#repository-layout)
- [Key capabilities](#key-capabilities)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Supabase & data model](#supabase--data-model)
- [Development workflow](#development-workflow)
- [Environment variables](#environment-variables)
- [Testing expectations](#testing-expectations)
- [Where to go next](#where-to-go-next)
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

2. Copy `.env.example` to `.env.development` (or `.env`) and populate Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Leave the invite placeholders in place—service-role keys and invite codes are supplied at runtime (see [Environment variables](#environment-variables)).

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with an invited account. Initial content can be loaded by running the seeding scripts after your database is provisioned; provide invite codes via environment variables when invoking `npm run seed:invite`.

## Vercel deployment

The repository is configured for a single Vercel project that builds the `chd-qbank` workspace. Use the settings below so builds reuse the shared tooling and stay on the supported Node.js release.

| Setting | Value |
| --- | --- |
| Root directory | `.` |
| Framework preset | Vite |
| Install command | `npm install --include-workspace-root` |
| Build command | `npm run -w chd-qbank build` |
| Output directory | `chd-qbank/dist` |
| Node.js version | `20.18.0` |

The `.vercelignore` file keeps documentation, scripts, and development-only artifacts out of the build context. Set the Supabase URL, anon key, and any optional analytics or feature flags as [project environment variables](https://vercel.com/docs/projects/environment-variables); the Vite client reads them at build time.

## Usage example

![Practice session and analytics overview](./docs/images/usage-dashboard.svg)

1. **Receive an invite and sign up.** Administrators share single-use codes managed via `app_settings`. Learners redeem a code through the Supabase Edge Function to activate their account and profile preferences.
2. **Launch a practice session.** The dashboard presents multiple-choice questions drawn from the congenital heart disease bank and highlights supporting media (imaging, audio). Learners submit answers, review explanations, and move through a curated session or topic drill.
3. **Review analytics.** After each session the analytics heatmap aggregates performance, streaks, and suggested focus areas so learners can target weak domains and instructors can monitor cohort progress.

## Supabase & data model

The canonical schema lives in [`chd-qbank/schema.sql`](./chd-qbank/schema.sql) alongside supporting policies in `storage-policies.sql` and scheduled tasks in `cron.sql`. See the [analytics overview](./docs/analytics/heatmap.md) and [Supabase admin guide](./docs/security/admin-roles.md) for deeper dives into the data model and permissioning.

New environments follow the seeding workflow outlined in the [release runbook](./docs/ops/release-runbook.md).

## Development workflow

1. Branch from `main` and install dependencies.
2. Implement changes in focused commits. Update SQL migrations and automation scripts when altering data models or Supabase behavior.
3. Run the required lint/test commands for code changes.
4. Update documentation to reflect user-facing or operational differences.
5. Open a pull request describing the change, attaching screenshots for UI modifications when possible.
6. Address review feedback promptly and keep scope tight—open draft pull requests if work is still in progress.

## Environment variables

Environment configuration (local, staging, production, and automation scripts) is covered in detail inside [`docs/runtime/environment-configuration.md`](./docs/runtime/environment-configuration.md).

## Testing expectations

- Run `npm run lint` and `npm run test` before submitting feature or bug-fix pull requests.
- The `tests/e2e` directory contains Vitest-powered UI flows (murmur drills, CXR labeling, onboarding) that rely on seeded content. Keep them in sync with seed templates when updating gameplay logic.
- Document executed commands in your pull request; documentation-only updates can reference the exemption in the PR template.

## Where to go next

- Visit the [documentation index](./docs/README.md) for the complete list of operational runbooks and deep dives.
- Consult [`SECURITY.md`](./SECURITY.md) for disclosure and credential rotation processes.
- Review [`docs/ops/release-runbook.md`](./docs/ops/release-runbook.md) before shipping to staging or production.

## License

This project is licensed under the [MIT License](./LICENSE).

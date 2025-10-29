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

- **Node.js 18 LTS or 20 LTS** – the root `.nvmrc`/`.tool-versions` pin Node 18 for contributors while the frontend workspace is
  tested against Node 20. Either version works locally; align with your deployment target (Vercel uses Node 20) and avoid mixing
  major versions across team members.
- **npm 9+**
- Access to a **Supabase** project (separate development and production projects are recommended)
- Service-role credentials for automation tasks (kept out of version control)

Install the pinned runtime with `nvm install` / `nvm use` or `asdf install` before running workspace commands. This keeps the
tooling (Vite, Vitest, ESLint) aligned with the versions expected in CI.

## Quick start

1. **Clone the repository and install dependencies.**

   ```bash
   git clone https://github.com/<your-org>/chd.git
   cd chd/chd-qbank
   npm install
   ```

2. **Provision a Supabase project.** Create a fresh project (one for development, another for production) and load the schema:

   - Run `schema.sql`, `storage-policies.sql`, and `cron.sql` in the Supabase SQL editor or by piping them through the Supabase CLI.
   - Deploy the `signup-with-code` Edge Function from `supabase/functions/signup-with-code` and configure its environment with
     `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Create the storage buckets `murmurs`, `cxr`, `ekg`, and `diagrams`.
   - Configure SMTP so Supabase can deliver password resets and invite flows.

3. **Configure environment variables.** Copy `.env.example` to `.env.development` (or `.env`) inside `chd-qbank/` and set:

   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>

   # Optional: enables automation helpers that require service-role access
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

   Leave the invite placeholders in place—service-role keys and invite codes are supplied at runtime (see [Environment variables](#environment-variables)).

4. **Seed starter content.** With the Supabase project provisioned, run the seeding scripts to load practice questions, media, and
   invite metadata:

   ```bash
   npm run seed:full
   INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" npm run seed:invite
   ```

   The `seed:full` command creates a default administrator (`admin@example.com` / `Admin123!`). Sign in immediately and rotate
   the credentials inside Supabase Auth.

5. **Start the development server.**

   ```bash
   npm run dev
   ```

6. **Open the app.** Visit [http://localhost:5173](http://localhost:5173) and sign in with the seeded admin account or an invitee.

These steps cover the minimum setup required to run the question bank locally. For a deeper walkthrough—including project
creation screenshots, environment variable conventions, and deployment tips—see [docs/installation.md](./docs/installation.md).

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

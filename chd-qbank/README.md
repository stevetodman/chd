# CHD QBank application

The CHD QBank is a static-first React application that delivers a congenital heart disease question bank, telemetry-backed practice analytics, and teaching games. This package contains the web client, automation scripts, Supabase assets, and seed templates used to stand up development and production environments. Learning games currently include Guess the Murmur, CXR Match, and the new Read the EKG interpretation drills.

## Directory tour

| Path | Description |
| --- | --- |
| `src/` | React + TypeScript source code, including routing, Zustand stores, and UI primitives. |
| `public/` | Static assets copied into the production build. |
| `supabase/` | Edge Functions and migration helpers deployed to Supabase. |
| `schema.sql`, `storage-policies.sql`, `cron.sql` | Canonical SQL used to bootstrap Postgres tables, Row Level Security, and scheduled jobs. |
| `scripts/` | Node/TypeScript utilities for seeding, verification, and migration safety checks. |
| `data/templates/` | Seed JSON referenced by automation scripts (`npm run seed:full`). |
| `tests/` | Vitest suites covering core UI flows and utility logic. |

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>

   # Optional: enable automation helpers that use service-role access
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

   The example file already includes invite placeholders—inject real values only when executing `npm run seed:invite` (e.g. `INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" npm run seed:invite`).

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with an invited account.

## Supabase bootstrap

Provision both development and production Supabase projects:

1. Run `schema.sql`, `storage-policies.sql`, and `cron.sql` in the Supabase SQL editor (or via `supabase db push`).
2. Deploy the `signup-with-code` Edge Function from `supabase/functions/signup-with-code` and configure `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for the function environment.
3. Create storage buckets: `murmurs`, `cxr`, `ekg`, and `diagrams`.
4. Configure SMTP (e.g., Resend) inside Supabase so invite emails can be delivered.
5. Seed representative content once the schema exists:

   ```bash
   npm run seed:full
   ```

6. Keep invite codes synchronized across environments by exporting the values inline when running the seeding script:

   ```bash
   INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" npm run seed:invite
   ```

   The script stores the active invite code and expiry in Supabase—keep these values out of the Vite (`VITE_*`) environment and secret stores scoped to runtime automation only.

The seed utilities read from `data/templates/` and enforce idempotency, so re-running them updates existing rows safely.

### Default admin & starter content

Running `npm run seed:full` now creates a ready-to-use administrator and loads a focused study set:

- **Admin credentials:** `admin@example.com` with password `Admin123!` (override via `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_ALIAS`). Sign in at [http://localhost:5173](http://localhost:5173) immediately after seeding, then rotate the password in Supabase Auth once your deployment is stable.
- **Sample questions and media:** the seed synchronizes congenital heart disease scenarios covering cyanotic lesions, murmurs, arrhythmias, and image interpretation, complete with linked media bundles (radiographs, diagrams, murmurs) so dashboards and drills render rich content on first launch.【F:chd-qbank/scripts/seed/seedData.ts†L38-L214】

These defaults ensure fresh environments are navigable without additional setup. Invite real users only after rotating the admin credentials and updating seeded aliases to suit your team.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Launch the development server. |
| `npm run build` | Generate the production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint on `src/`. |
| `npm run test` | Execute the Vitest suite. |
| `npm run build:scripts` | Compile TypeScript utilities in `scripts/`. |
| `npm run check:migration-safety` | Scan `supabase/migrations` for destructive or unsafe SQL patterns. |
| `npm run seed:invite` | Upsert the invite-code configuration in `app_settings`. |
| `npm run seed:full` | Seed questions, games, media bundles, and related metadata. |
| `npm run verify:seed` | Perform a read-only integrity check against the current database contents. |
| `npm run verify:analytics:heatmap` | Exercise the analytics materialized view using synthetic responses. |

## Testing & quality

- Run `npm run lint` and `npm run test` prior to submitting pull requests.
- End-to-end style tests live in `tests/e2e/` (onboarding, murmur drills, CXR labeling, practice responses). Ensure fixtures remain consistent with seed data when making gameplay changes.
- Use `npm run check:migration-safety` whenever editing SQL migrations to catch non-concurrent index creation, `DROP TABLE`, or risky constraint updates.

## Operational references

- Heatmap analytics workflow: [`../docs/analytics/heatmap.md`](../docs/analytics/heatmap.md)
- Event retention jobs: [`../docs/ops/event-retention.md`](../docs/ops/event-retention.md)
- Service worker behavior: [`../docs/runtime/service-worker.md`](../docs/runtime/service-worker.md)
- Admin role management: [`../docs/security/admin-roles.md`](../docs/security/admin-roles.md)

Keep documentation and seed templates updated whenever schemas or user flows change—automation scripts assume they stay in sync.

## Deploying to Vercel

### Prerequisites

- Node.js 20.x (matches [`.nvmrc`](../.nvmrc) and Vercel’s runtime selection).
- A Vercel account with access to the target project.
- Supabase project credentials (anon + service role) and invite metadata so the build can connect after deployment.
- Optional but recommended: [Vercel CLI](https://vercel.com/docs/cli) for local smoke tests.

### Required environment variables

Configure these variables in **Project Settings → Environment Variables** for the `Production`, `Preview`, and `Development` environments unless noted otherwise:

| Name | Description | Scope |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase project URL used by the client. | All environments |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for browser calls. | All environments |
| `VITE_APP_NAME` | Display name surfaced in the UI header and metadata. | All environments |
| `SUPABASE_URL` | Service-role Supabase URL for automation scripts (never exposed client-side). | Preview/Production builds that run seeding or cron helpers |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key needed by the scripts triggered post-deploy. | Preview/Production builds that run seeding or cron helpers |
| `INVITE_CODE` | Seed script invite code; set as needed when running manual seeding jobs. | Manual/temporary (do not persist in Vercel) |
| `INVITE_EXPIRES` | Expiration date paired with the invite code. | Manual/temporary (do not persist in Vercel) |

> ℹ️ Client-side variables must begin with `VITE_`. Do **not** store invite credentials permanently—supply them via the CLI only when running seeding commands.

### Vercel project settings

| Setting | Value | Notes |
| --- | --- | --- |
| **Root Directory** | `chd-qbank` | Ensures builds execute inside the workspace. |
| **Build Command** | `npm run build` | Runs the Vite production build defined in [`package.json`](./package.json). |
| **Output Directory** | `dist` | Matches Vite’s default output folder. |
| **Install Command** | `npm install` | Installs workspaces and shared dependencies at the repo root. |
| **Node.js Version** | `20` | Matches `.nvmrc`; set under **Project Settings → General → Node.js Version**. |

### SPA routing rewrite

Add a single-page application fallback so client-side routes resolve correctly:

1. Open **Project Settings → Routing → Rewrites**.
2. Add a rule where `Source` is `/*` and `Destination` is `/index.html`.
3. Save changes and redeploy; Vercel will now serve the Vite bundle for deep links.

Alternatively, commit the rule to `vercel.json` if you prefer infrastructure-as-code.

### Local verification with Vercel CLI

1. Install the CLI if needed: `npm install -g vercel`.
2. From the repo root, authenticate once with `vercel login`.
3. Run a production build locally to confirm settings: `vercel build --prod`.
4. Preview the build output: `vercel deploy --prebuilt --prod`.

This workflow uses your local `.env` values, so confirm they mirror the Vercel dashboard before deploying.

### Common failure modes

| Symptom | Likely cause | Remedy |
| --- | --- | --- |
| 404s on nested routes | SPA rewrite missing. | Add the `/* → /index.html` rewrite in Vercel settings or `vercel.json`, then redeploy. |
| Build fails with `VITE_SUPABASE_URL is not defined` | Environment variables absent in Vercel. | Populate the required vars in **Project Settings → Environment Variables** and re-trigger the deploy. |
| Runtime API calls return 401s/404s | Supabase anon key or URL mismatched between environments. | Re-issue the anon key in Supabase and update Vercel, or verify project-specific URLs. |
| Seed scripts crash post-deploy | Service role credentials not available or invite variables persisted. | Provide `SUPABASE_SERVICE_ROLE_KEY` only where automation scripts run; avoid storing `INVITE_*` secrets permanently. |
| CLI `vercel build` differs from hosted deploy | Using the wrong Node version locally. | Install Node 20 (`nvm install 20 && nvm use 20`) to match Vercel’s runtime. |

## QBank Tests

Add new question items by placing JSON files under `content/questions/`. Each file should follow the schema defined in `src/schema/question.schema.ts` and include any media assets referenced in `public/media/`.

Run the validation suite with `npm test` for a one-time check or `npm run test:watch` while iterating locally.

If you intentionally change the question shape, update snapshots with `npx vitest -u`.

### QBank Tests
Add items under `content/questions/`. Run:
  npm test
  npm run test:watch
Update snapshots intentionally:
  npx vitest -u

### QBank Migration (schema normalization)
Dry run (no writes):
  npm run migrate:qbank:dry

Perform migration with backups + CSV report:
  npm run migrate:qbank

Outputs:
- Backups → chd-qbank/content/_backup_YYYYMMDD_HHMMSS/
- Report  → chd-qbank/content/_reports/migration_YYYYMMDD_HHMMSS.csv


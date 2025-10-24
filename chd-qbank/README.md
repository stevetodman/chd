# CHD QBank application

The CHD QBank is a static-first React application that delivers a congenital heart disease question bank, telemetry-backed practice analytics, and teaching games. This package contains the web client, automation scripts, Supabase assets, and seed templates used to stand up development and production environments.

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
   INVITE_CODE=<optional-invite-code>
   INVITE_EXPIRES=<optional-iso-date>
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with an invited account.

## Supabase bootstrap

Provision both development and production Supabase projects:

1. Export Supabase credentials:

   ```bash
   export SUPABASE_PROJECT_REF=<project-ref>
   export SUPABASE_ACCESS_TOKEN=<personal-access-token>
   export SUPABASE_URL=<https://xyzcompany.supabase.co>
   export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

   These can also live in a local `.env` file consumed by the provisioning script.

2. Run the provisioning workflow to create storage buckets, apply the SQL schema, and deploy the Edge Function (requires the [Supabase CLI](https://supabase.com/docs/guides/cli/installation)):

   ```bash
   npm run provision:supabase
   ```

3. Configure SMTP (e.g., Resend) inside Supabase so invite emails can be delivered.
4. Seed representative content once the schema exists:

   ```bash
   npm run seed:full
   ```

5. Keep invite codes synchronized across environments:

   ```bash
   npm run seed:invite
   ```

   The script stores the active invite code and expiry in Supabase—keep these values out of the Vite (`VITE_*`) environment.

The seed utilities read from `data/templates/` and enforce idempotency, so re-running them updates existing rows safely.

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


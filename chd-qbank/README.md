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

1. Run `schema.sql`, `storage-policies.sql`, and `cron.sql` in the Supabase SQL editor (or via `supabase db push`).
2. Deploy the `signup-with-code` Edge Function from `supabase/functions/signup-with-code` and configure `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for the function environment.
3. Create storage buckets: `murmurs`, `cxr`, `ekg`, and `diagrams`.
4. Configure SMTP (e.g., Resend) inside Supabase so invite emails can be delivered.
5. Seed representative content once the schema exists:

   ```bash
   npm run seed:full
   ```

6. Keep invite codes synchronized across environments:

   ```bash
   npm run seed:invite
   ```

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

# CHD QBank Architecture (C4 Overview)

## Level 1 – System Context
- **Clinicians and trainees** access the CHD QBank through a browser-based single-page application (SPA) to study congenital heart disease content, play teaching games, and review analytics. The SPA communicates with Supabase services for authentication, content retrieval, telemetry, and media delivery.
- **Administrators** manage question content, invite codes, and operational settings through the same SPA, relying on privileged flows enforced by role-based policies in Supabase.
- **External services** include Supabase (Auth, Postgres, Storage, Edge Functions, Cron) and delivery channels such as SMTP for invite emails.

## Level 2 – Container View
- **Web Client (Vite SPA)** – A React + TypeScript application bundled by Vite. It serves static assets from `public/`, builds routes and UI from `src/`, and bundles with Tailwind CSS. The client authenticates with Supabase, renders study flows, and calls backend APIs via Supabase clients configured at build time. 【F:chd-qbank/README.md†L1-L52】
- **Supabase Backend** – Managed Postgres database with Row Level Security, Auth, Storage buckets (`murmurs`, `cxr`, `ekg`, `diagrams`), cron jobs, and Edge Functions. SQL definitions in `schema.sql`, `storage-policies.sql`, and `cron.sql` establish tables, enums, RLS policies, and scheduled jobs. The `signup-with-code` Edge Function enforces invite-only onboarding and idempotent account creation. 【F:chd-qbank/README.md†L33-L60】【F:chd-qbank/supabase/functions/signup-with-code/index.ts†L1-L160】
- **Automation Scripts** – TypeScript utilities under `scripts/` compiled with `npm run build:scripts`. They seed data from `data/templates/`, synchronize invite codes, verify analytics materialized views, and enforce migration safety for Supabase SQL. 【F:chd-qbank/README.md†L9-L36】【F:chd-qbank/README.md†L62-L111】
- **CI/CD Pipeline** – GitHub Actions workflows validate the codebase. Pipelines lint, test, execute end-to-end suites, run secret scans, and verify QBank content on pushes and pull requests. 【F:.github/workflows/ci.yml†L1-L200】【F:.github/workflows/e2e.yml†L1-L200】【F:.github/workflows/e2e-pr.yml†L1-L200】【F:.github/workflows/secret-scan.yml†L1-L200】【F:.github/workflows/validate-qbank.yml†L1-L200】

## Level 3 – Component View
### Web Client
- **Routing and views** inside `src/` render study modules, analytics dashboards, and admin controls while coordinating with Zustand state stores.
- **API integration layer** wraps Supabase JavaScript clients for auth, data access, and telemetry events, using environment variables defined via Vite configuration.
- **UI primitives and game engines** encapsulate question rendering, murmur drills, and labeling exercises, consuming media and telemetry data from Supabase.

### Supabase Backend
- **Postgres schema**: `schema.sql` provisions tables for questions, media bundles, gameplay events, analytics views, and settings with triggers/auditing for configuration changes.
- **Row Level Security policies**: `storage-policies.sql` and table policies limit access based on JWT claims, enforcing invite-only data visibility per user role.
- **Edge Function (`signup-with-code`)**: validates invite codes, assigns aliases, and guarantees idempotent signups before allowing client access.
- **Cron jobs**: `cron.sql` schedules retention and maintenance tasks (e.g., pruning telemetry) to keep datasets manageable.

### Automation & Operations
- **Seed pipeline**: `npm run seed:full` loads canonical content, media bundles, and configuration into Supabase; `npm run seed:invite` syncs invite codes between environments.
- **Verification suites**: scripts such as `npm run verify:seed` and `npm run verify:analytics:heatmap` perform integrity checks without mutating production data.
- **Migration safety**: `npm run check:migration-safety` scans Supabase migrations for unsafe SQL patterns prior to deployment.

### CI/CD Components
- **Static analysis**: `ci.yml` installs dependencies, runs linting, unit tests, and build checks for the SPA and scripts.
- **End-to-end coverage**: `e2e.yml` and `e2e-pr.yml` trigger Vitest-powered workflow tests simulating onboarding and gameplay flows.
- **Security automation**: `secret-scan.yml` uses GitHub Advanced Security to scan for leaked secrets, and `validate-qbank.yml` ensures question templates remain valid.

## Level 4 – Code & Data View
- **Frontend code** lives in `chd-qbank/src/` with TypeScript enforcing type safety, while Tailwind and PostCSS define the design system via `tailwind.config.ts` and `postcss.config.js`.
- **Shared configuration**: Vite config (`vite.config.ts`) and TypeScript configs (`tsconfig*.json`) align build targets across SPA and scripts.
- **Data templates** in `data/templates/` provide deterministic seed inputs for automation, ensuring reproducible environments.
- **Database artifacts** (`schema.sql`, `storage-policies.sql`, `cron.sql`) serve as infrastructure-as-code for Supabase, versioned alongside the application for auditable changes.
- **Supabase Edge runtime** code resides in `supabase/functions/`, with Deno-based modules deployed through Supabase CLI to enforce security-sensitive workflows such as signup with invite codes.
- **Testing assets**: `tests/` contains Vitest suites and fixtures, while GitHub Actions workflows orchestrate automated validation before releases.


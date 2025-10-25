# Release and operations runbook

This document consolidates the deployment, verification, and rollback guidance that previously lived in `RUNBOOK.md` and `RELEASE.md`.

## Environment map

| Stage | Hosting | Purpose | Entry point |
| --- | --- | --- | --- |
| Local | Vite dev server | Feature development and UI polish. | `npm --prefix chd-qbank run dev` |
| Staging | Vercel preview | Rehearsal environment backed by the staging Supabase project. | Auto-deployed from pull requests / `main`. |
| Production | Vercel production | Live learner experience connected to the production Supabase project. | Manual promote from staging or targeted deploy. |

## Supabase configuration checklist

* Confirm auth redirect URLs include localhost, staging, and production origins.
* Storage buckets: `murmurs`, `cxr`, `ekg`, `diagrams` should remain private.
* Edge Function `signup-with-code` must have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets populated.
* `app_settings` flags:
  * `leaderboard_enabled` — toggle leaderboard visibility.
  * `maintenance_mode` — display maintenance messaging during cutovers.

## Seeding and verification commands

Run these from the repository root:

```bash
# Refresh staging
export $(cat chd-qbank/.env.staging | xargs)
npm --prefix chd-qbank run seed:full
npm --prefix chd-qbank run seed:invite

# Refresh production (use extreme care)
export $(cat chd-qbank/.env.production | xargs)
npm --prefix chd-qbank run seed:full
npm --prefix chd-qbank run seed:invite
```

Post-deploy verification against the active database:

```bash
npm --prefix chd-qbank run verify:seed
npm --prefix chd-qbank run verify:analytics:heatmap
```

## Release checklist

1. ✅ **CI gates**: lint, types, unit tests, build assets, and staging E2E suite are all green.
2. ✅ **Manual rehearsal** on staging:
   * Sign up with an invite, log in, answer a question, and confirm explanations render.
   * Toggle leaderboard on/off in `app_settings` and verify the UI reacts correctly.
   * Perform a quick smoke test in Mobile Safari.
3. ✅ **Go/No-Go** meeting:
   * `leaderboard_enabled` reflects the intended state for launch.
   * `maintenance_mode` is `false` unless you are actively shielding users during migration.
   * Seeds applied and at least one admin account is present.
4. 🚀 **Promote**:
   * Merge the approved PR into `main` to trigger the Vercel production deployment, or manually promote the latest staging build.
5. 🔎 **Post-release checks**:
   * Repeat the verification scripts against production.
   * Create a fresh learner account via invite and confirm the analytics flow.

## Rollback plan

* **Application**: Vercel → Project → Deployments → Promote the previous stable build.
* **Database**: restore a Supabase backup or revert the last migration/seed batch.
* **Communication**: toggle `maintenance_mode` to `true` and notify learners if downtime is required.

## Day-one monitoring

* Supabase logs should be clear of auth errors or failed function calls.
* If using email auth, validate password reset flows.
* Confirm analytics tiles populate after the first few completed sessions.

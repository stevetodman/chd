# Release & Operations Guide

This handbook combines the previous runbook and release checklist into a single source of truth for promoting the CHD QBank application from development to production. Follow these steps whenever you stage a deployment, verify Supabase data, or respond to production issues.

## Environment overview

| Environment | Hosting | Purpose | Notes |
| --- | --- | --- | --- |
| Local | Developer machine | Feature work, automated tests, and script rehearsal. | Run `npm run dev` and point to a personal Supabase project. |
| Staging | Vercel preview + Supabase staging project | Full rehearsal environment mirroring production configuration. | Triggered via pull requests; shares service-role credentials with staging Supabase. |
| Production | Vercel production + Supabase production project | Live learner experience. | Promote only after staging rehearsal and verification complete. |

Supabase configuration quick links:

- **Allowed redirects:** Ensure the Supabase auth settings include localhost, staging, and production URLs.
- **Storage buckets:** `murmurs`, `cxr`, `ekg`, `diagrams` (private by default).
- **Edge Function (`signup-with-code`):** Secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must stay current in each environment.
- **`app_settings` toggles:**
  - `leaderboard_enabled`: `"true"` or `"false"`.
  - `maintenance_mode`: `"true"` or `"false"` (flip during production cutovers).

## Release workflow

1. **Prepare a pull request.**
   - Run `npm run lint` and `npm run test` locally.
   - Update Supabase migrations or seeds that accompany the change.
   - Document testing output in the pull request template.
2. **Ensure CI is green.** Required checks include lint, unit tests, build, and any end-to-end suites.
3. **Merge to the main branch.** Vercel automatically deploys the staging environment.
4. **Rehearse on staging.**
   - Sign up with an invite code, log in, answer a question, and review the explanation flow.
   - Toggle leaderboard visibility if the release changes rankings or analytics.
   - Smoke test on a mobile browser (Safari or Chrome) when UI updates ship.
5. **Run automated verification against staging.** Execute the following commands from the repo root:

   ```bash
   npm --prefix chd-qbank run verify:seed
   npm --prefix chd-qbank run verify:analytics:heatmap
   ```

   Investigate and resolve any discrepancies before promoting the build.
6. **Set maintenance mode (optional).** If downtime is required, set `maintenance_mode` to `true` in `app_settings` before promotion.
7. **Promote to production.**
   - Use Vercel’s “Promote to Production” button on the verified staging deployment, or
   - Trigger a production deployment from the main branch if additional commits landed.
8. **Run verification against production.** Repeat the verification commands with production credentials and ensure analytics refresh successfully.
9. **Disable maintenance mode** and announce the completion of the release.

## Seeding & data management

Run the seed commands any time Supabase content, invite codes, or reference data changes.

```bash
# Staging
export $(cat chd-qbank/.env.staging | xargs)
npm --prefix chd-qbank run seed:full
npm --prefix chd-qbank run seed:invite

# Production
export $(cat chd-qbank/.env.production | xargs)
npm --prefix chd-qbank run seed:full
npm --prefix chd-qbank run seed:invite
```

Always audit `app_settings` after seeding to confirm that invite codes and toggles match expectations.

## Rollback procedures

- **Application rollback:** In Vercel, open *Deployments*, locate the last known-good build, and click **Promote to Production**.
- **Database rollback:**
  - Restore a Supabase point-in-time snapshot if the issue stems from data corruption.
  - Revert the most recent migration and re-run `npm run seed:full` if a structural change caused the regression.
- **Edge Functions:** Re-deploy the previous version from your CI artifacts or local history if a new function release introduced regressions.

Document the reason for any rollback in the incident tracker and capture follow-up actions for the postmortem.

## Day-1 production spot check

Within the first hour after promotion, complete the following smoke test:

- Create a new learner using the current invite code and complete at least three questions.
- Confirm Supabase logs show no authentication or function errors.
- Validate password reset emails when email auth is enabled.
- Refresh analytics materialized views (`select analytics_refresh_heatmap();`) and review dashboards for anomalies.

## Incident response expectations

If production issues arise:

1. Page the on-call owner listed in the internal escalation matrix (see [SECURITY.md](../../SECURITY.md) for contact channels).
2. Flip `maintenance_mode` to `"true"` when user impact warrants a temporary freeze.
3. Collect logs, Supabase query IDs, and recent deployment IDs before opening a retrospective issue.
4. File a follow-up ticket summarizing root cause, mitigation steps, and any automation gaps discovered.

Maintainers should acknowledge incident reports within **30 minutes** during business hours and within **2 hours** otherwise.

# CHD QBank Runbook (Zero-to-Live)

## Environments
- Dev (local): `npm run dev`
- Staging (Vercel): used for rehearsal
- Prod (Vercel): live for learners

## Supabase quick links
- Auth → URL config includes localhost + staging + prod
- Storage buckets: murmurs, cxr, ekg, diagrams (private)
- Edge Function: `signup-with-code` (NO JWT verify), secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- app_settings keys:
  - leaderboard_enabled: "true" | "false"
  - maintenance_mode: "true" | "false"

## Seeds
```bash
# staging
export $(cat chd-qbank/.env.staging | xargs)
npm --prefix chd-qbank run seed:full
npm --prefix chd-qbank run seed:invite

# prod
export $(cat chd-qbank/.env.production | xargs)
npm --prefix chd-qbank run seed:full
npm --prefix chd-qbank run seed:invite
```

## Release flow
1. Open PR → CI must pass (lint/types/unit/build).
2. Merge → Vercel deploys staging.
3. Rehearsal (signup → login → answer → results).
4. Run automated verification against the deployed database:
   - `npm --prefix chd-qbank run verify:seed`
   - `npm --prefix chd-qbank run verify:analytics:heatmap`
5. Flip maintenance_mode ON if needed.
6. Promote to prod (merge to main or Vercel prod deploy).
7. Repeat step 4 against prod after promotion, then turn maintenance OFF.

## Rollback
- Vercel → Project → Deployments → Promote previous.
- For DB: restore snapshot (Supabase) or revert last migration/seed.

## Day-1 spot check
- New prod account with invite → 3 Qs → results OK.
- Supabase Logs: no errors.
- (If using email) password reset works.

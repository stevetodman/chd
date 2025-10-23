# Release Process (Staging → Prod)

## CI Gates (must be green)
- Lint, Types, Unit Tests, Build (CI)
- E2E on staging (Playwright) – happy path passes

## Manual Rehearsal (staging)
- Signup with invite → Login → Answer question → See explanation
- Leaderboard on/off behaves as expected
- Mobile Safari quick check

## Go/No-Go
- Supabase app_settings sane:
  - leaderboard_enabled = true
  - maintenance_mode = false (or true during cutover)
- Seeds applied; admin user present for prod

## Promote
- Merge to main → Vercel prod deploy
- If issues: Vercel → Deployments → Promote previous

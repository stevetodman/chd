# Environment variables

The project relies on a mix of client-side (Vite) variables and secrets that
must stay on the server or in your Supabase dashboard. Use
`chd-qbank/.env.example` as a template for local development and mirror the
same values in the appropriate hosting dashboards.

## Client runtime (Vite)

These variables are embedded into the browser bundle. Store them in
`chd-qbank/.env` for local work and in the Vercel project settings for hosting.

| Variable | Purpose | Local file(s) | Hosted location |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL, e.g., `https://<project>.supabase.co`. | `.env`, `.env.staging`, `.env.production` | Vercel → Project → Settings → Environment Variables |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public API key. Safe for client use only. | `.env*` | Vercel env vars |
| `VITE_APP_NAME` | Optional override for the displayed product name. | `.env*` | Vercel env vars |

## Server-side and automation secrets

Never expose these via Vite variables. Keep them in local shell environments,
`.env` files ignored by Git, or secret managers (Supabase, Vercel, CI).

| Variable | Purpose | Set locally | Hosted location |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Same project URL as above, consumed by scripts and functions. | `.env*` | Supabase Edge Functions / CI secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key with elevated privileges. | `.env*` | Supabase Edge Functions / CI secrets |
| `INVITE_CODE` | Optional invite code seeded by `npm run seed:invite`. | `.env*` when seeding | Supabase Edge Functions (if needed) |
| `INVITE_EXPIRES` | ISO 8601 timestamp or date string for invite expiry. | `.env*` when seeding | Supabase Edge Functions (if needed) |

## Script/test toggles

These values are only read by local scripts or tests. Populate them as needed.

| Variable | Purpose | Suggested scope |
| --- | --- | --- |
| `BUILD_HASH` | Overrides the build hash embedded in bundles. | Local build experiments |
| `DRY_RUN` | Enables dry-run mode for migration utilities. | Local shell when running scripts |
| `SUPABASE_ANON_KEY` | Required only for the analytics RLS integration test. | Local test runs |
| `BASE_URL` | Custom base URL for Playwright E2E tests. | Local test runs |
| `HEATMAP_VERIFY_ALLOW_PROD` | Gate to allow analytics verification against production. | CI or local automation when intentionally targeting prod |

## Secret scanning

Gitleaks runs in CI (`.github/workflows/secret-scan.yml`) to detect committed
secrets. Keep real credentials in private dashboards or `.env` files that stay
out of version control.

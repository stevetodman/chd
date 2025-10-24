# Environment Variables

`ENV.md` is the authoritative source for the variables needed across the CHD QBank stack. Use the following tables to determine which values belong in local `.env` files, Supabase function secrets, and Vercel project settings.

## Application runtime (Vite / browser)

Set these variables anywhere the Vite client runs (`.env`, `.env.staging`, `.env.production`, or Vercel project settings). Never expose service-role secrets here.

| Name | Required | Description | Where to configure |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL (`https://<ref>.supabase.co`). | `.env*`, Vercel |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key for client auth. | `.env*`, Vercel |
| `VITE_APP_NAME` | ⚙️ | Optional label used in UI chrome and metadata. Defaults to “CHD QBank”. | `.env*`, Vercel |

## Automation & scripts (local only)

These values power seed, verification, and maintenance scripts. Keep them out of Vercel and browser bundles.

| Name | Required | Description | Where to configure |
| --- | --- | --- | --- |
| `SUPABASE_URL` | ✅ | Matches `VITE_SUPABASE_URL`; included here so Node scripts can run without loading Vite envs. | `.env*`, Supabase Edge Function secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key used for seeding and verification. Treat as highly sensitive. | `.env*`, Supabase Edge Function secrets |
| `INVITE_CODE` | ⚙️ | Latest invite code seeded via `npm run seed:invite`. Rotate whenever codes change. | `.env*` |
| `INVITE_EXPIRES` | ⚙️ | ISO 8601 expiration timestamp that pairs with `INVITE_CODE`. | `.env*` |

## Build and observability helpers

| Name | Required | Description | Where to configure |
| --- | --- | --- | --- |
| `BUILD_HASH` | ⚙️ | Overrides the build hash embedded in the service worker. Useful for emergency cache busting. | `.env.production` |

## Configuration tips

- Maintain separate `.env` files per environment inside `chd-qbank/` (e.g., `.env.development`, `.env.staging`, `.env.production`). Commit only the `.env.example` template.
- Vercel should receive only `VITE_*` variables. Use Supabase’s secrets manager for the service-role key powering Edge Functions such as `signup-with-code`.
- When rotating credentials, update the appropriate `.env` file, re-run `npm run seed:invite`, and redeploy the Supabase Edge Function so each environment stays in sync.

# Environment Variables

## Frontend (Vite) – set in Vercel and `.env*`
- `VITE_SUPABASE_URL`: Your Supabase project URL (https://<ref>.supabase.co)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
- `VITE_APP_NAME`: Displayed app name, e.g., "CHD QBank"

## Local-only for scripts (NOT on Vercel)
- `SUPABASE_URL`: same as above
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key (never expose in frontend)
- `INVITE_CODE`: Current invite code (used by `npm run seed:invite`)
- `INVITE_EXPIRES`: YYYY-MM-DD expiration date for the invite code

## Optional
- `BUILD_HASH`: override build hash at compile time

## Where to set
- Local dev: `.env`, `.env.staging`, `.env.production` in `chd-qbank/`
- Vercel: Project → Settings → Environment Variables (VITE_* only)
- Supabase Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

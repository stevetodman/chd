# Environment Variable Reference

This project relies on a small set of environment variables. Use this guide when creating local `.env` files or configuring deployment platforms. The `.env.example` file is provided only as a template; it contains placeholder values and must never include real credentials or secrets.

## Supabase client configuration (`VITE_*`)
- `VITE_SUPABASE_URL` – Supabase project URL used by the frontend.
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key exposed to the browser.
- `VITE_APP_NAME` – Optional friendly name displayed in the UI.

## Server-side automation scripts
- `SUPABASE_URL` – Same Supabase project URL, consumed by scripts.
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key for admin automation. Treat it as highly sensitive.

## Invite seeding runtime inputs
- `INVITE_CODE` – Invite token passed to seeding scripts at execution time.
- `INVITE_EXPIRES` – ISO date string indicating when the invite should expire.

Only supply invite and service-role credentials in your runtime environment or secret manager. Do not persist them in source control.

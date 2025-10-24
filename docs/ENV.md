# Environment Variable Reference

This project relies on a small set of environment variables. Use this guide when creating local `.env` files or configuring deployment platforms. Never commit real credentials or secrets to the repository—only blank placeholders belong in example files.

## Supabase client configuration (`VITE_*`)
- `VITE_SUPABASE_URL` – Supabase project URL used by the frontend.
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key exposed to the browser.
- `VITE_APP_NAME` – Optional friendly name displayed in the UI.

## Server-side automation scripts
- `SUPABASE_URL` – Same Supabase project URL, consumed by scripts.
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key for admin automation. Treat it as highly sensitive.
- `SEED_ADMIN_EMAIL` – Optional override for the default administrator email inserted by `npm run seed:full`.
- `SEED_ADMIN_PASSWORD` – Optional override for the seeded administrator password. Rotate immediately after first login.
- `SEED_ADMIN_ALIAS` – Optional override for the seeded administrator alias displayed in leaderboards and history.

## Invite seeding runtime inputs
- `INVITE_CODE` – Invite token passed to seeding scripts at execution time.
- `INVITE_EXPIRES` – ISO date string indicating when the invite should expire.

Only supply invite and service-role credentials in your runtime environment or secret manager. Do not persist them in source control.

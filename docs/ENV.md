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

### Provisioning checklist

1. Copy `chd-qbank/.env.example` locally and leave invite placeholders as-is.
2. Export or prefix real values when seeding:

   ```bash
   INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" npm run --prefix chd-qbank seed:invite
   ```

3. Store production secrets in a managed secret store (Supabase project secrets, Vercel environment variables, etc.) and load them into the environment before executing the script.
4. Rotate invite codes immediately if they may have leaked (accidental commit, shared screenshot, etc.) and rerun the seeding command.

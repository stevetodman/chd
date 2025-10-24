# Environment Variables

## Frontend (Vite) – set in Vercel and `.env*`
- `VITE_SUPABASE_URL`: Your Supabase project URL (https://<ref>.supabase.co)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
- `VITE_APP_NAME`: Displayed app name, e.g., "CHD QBank"

## Local-only for scripts (NOT on Vercel)
- `SUPABASE_URL`: same as above
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key (never expose in frontend)
- `INVITE_CODE`: Current invite code (used by `npm run seed:invite`; supply at runtime rather than committing it to disk)
- `INVITE_EXPIRES`: YYYY-MM-DD expiration date for the invite code

## Optional
- `BUILD_HASH`: override build hash at compile time
- `APP_ENV`: Overrides the inferred environment when loading `.env` files (`development`, `staging`, or `production`)

## Where to set
- Local dev: `.env`, `.env.staging`, `.env.production` in `chd-qbank/`
- Vercel: Project → Settings → Environment Variables (VITE_* only)
- Supabase Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Invite code provisioning workflow

- Copy `.env.example` and leave the invite placeholders untouched; actual codes are injected when you run `npm run seed:invite`.
- Supply credentials inline when seeding (example):

  ```bash
  INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" APP_ENV=production npm run seed:invite
  ```

- Store production values in your secret manager (Vercel, Supabase, 1Password, etc.) and export them into the shell just before running the script.
- Rotate invite codes immediately if they are ever exposed (e.g., leaked logs or accidental commits) and rerun the seeding command with the new values.

## Selecting environment files

- Tooling loads `.env`, `.env.local`, `.env.<environment>`, and `.env.<environment>.local` in that order. Values from more
  specific files override base definitions unless they are already defined in the shell.
- The active environment defaults to `development` but can be changed by setting `APP_ENV` or `NODE_ENV`.
- Automation scripts automatically read the correct file before executing. For example:

  ```bash
  # Use staging credentials when seeding invite codes
  APP_ENV=staging npm run seed:invite

  # Run safety checks against production settings
  APP_ENV=production npm run verify:policies
  ```

- Vite commands accept `--mode <environment>`; convenience npm scripts are available for staging and production builds:

  ```bash
  npm run dev:staging
  npm run build:staging
  npm run preview:staging
  ```

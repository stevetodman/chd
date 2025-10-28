# Environment configuration

This guide centralizes the environment variable expectations for local development, automation scripts, and hosted deployments. It replaces the duplicated notes that previously lived in `README.md` and `ENV.md`.

## Variable reference

### Frontend (Vite)
These variables are consumed by the React application at build time. Expose only the public keys in browser environments.

| Name | Purpose | Where to set |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (`https://<ref>.supabase.co`). | `.env*` files locally, Vercel project settings. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key used by the client SDK. | `.env*` files locally, Vercel project settings. |
| `VITE_APP_NAME` | Optional display name injected into the UI. | `.env*` files locally, Vercel project settings. |

### Backend-only helpers
These values should never be shipped with the frontend bundle. They are read by Node-based automation scripts and Supabase Edge Functions.

| Name | Purpose | Where to set |
| --- | --- | --- |
| `SUPABASE_URL` | Same project URL as above, but supplied directly to scripts. | Shell exports when running scripts, Supabase function secrets. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key that authorizes migrations, seeding, and verification utilities. | Secret manager only (no commits, no Vercel exposure). |
| `INVITE_CODE` | Single-use invite code managed by `npm run seed:invite`. | Export just before running the script; store long-lived values in a secret manager. |
| `INVITE_EXPIRES` | Expiration date for the invite code (`YYYY-MM-DD`). | Same workflow as `INVITE_CODE`. |

### Optional switches

| Name | Purpose |
| --- | --- |
| `BUILD_HASH` | Overrides the build hash stamp for static asset versioning. |
| `APP_ENV` | Selects which `.env` files automation scripts load (`development`, `staging`, or `production`). |
| `NODE_ENV` | Standard Node environment value; doubles as a fallback for selecting `.env` files. |
| `SEED_ADMIN_AUTO_CONFIRM` | Set to `true`/`1` to bypass email verification when seeding the default admin (use only for throwaway environments). |

## Recommended workflows

### Local development
1. Duplicate `chd-qbank/.env.example` to the appropriate `.env` files (`.env.development`, `.env.staging`, etc.).
2. Populate the Supabase URL and anon key. Leave the invite placeholders untouched.
3. Run `npm install` followed by `npm run dev` from `chd-qbank/`.

When invoking workspace scripts from the repository root, prefix the command with `npm --prefix chd-qbank` so npm executes the
script defined in the `chd-qbank` package.

Automation scripts automatically read, in order, `.env`, `.env.local`, `.env.<environment>`, and `.env.<environment>.local`. More specific files override values from broader ones. Set `APP_ENV` when you need to target staging or production credentials:

```bash
APP_ENV=staging npm --prefix chd-qbank run seed:invite
APP_ENV=production npm --prefix chd-qbank run verify:policies
```

### Seeding invite codes

Inject invite data through the shell rather than hard-coding it in files. A typical staging refresh looks like:

```bash
export $(cat chd-qbank/.env.staging | xargs)
INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" APP_ENV=staging npm --prefix chd-qbank run seed:invite
```

Rotate invite codes immediately if the values are ever exposed (logs, screenshots, or accidental commits).

### Hosted deployments

* **Vercel:** Only configure the `VITE_*` variables. Service-role keys must never live in the frontend environment.
* **Supabase Edge Functions:** Provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` through the Supabase dashboard or your secret manager.
* **Continuous integration:** Export the service-role key just-in-time for migrations or verification scripts. Store secrets in the CI provider’s secure storage.

For additional operational context, see the [release runbook](../ops/release-runbook.md).

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
| `INVITE_CODE_SALT` | Optional salt used to deterministically hash invite codes. | Export alongside `INVITE_CODE` if you need to reuse the same code; leave empty to autogenerate. |
| `SEED_ADMIN_EMAIL` | Email address for the default admin user seeded by `npm run seed:full`. | Export before running the full seed to override the default `admin@example.com`. |
| `SEED_ADMIN_PASSWORD` | Initial password for the default admin. | Export with the full seed command; rotate via Supabase Auth after login. |
| `SEED_ADMIN_ALIAS` | Display name applied to the seeded admin profile. | Export alongside the other `SEED_ADMIN_*` variables when seeding. |

### Optional switches

| Name | Purpose |
| --- | --- |
| `BUILD_HASH` | Overrides the build hash stamp for static asset versioning. |
| `APP_ENV` | Selects which `.env` files automation scripts load (`development`, `staging`, or `production`). |
| `NODE_ENV` | Standard Node environment value; doubles as a fallback for selecting `.env` files. |
| `SEED_ADMIN_AUTO_CONFIRM` | Set to `true`/`1` to bypass email verification when seeding the default admin (use only for throwaway environments). |
| `DRY_RUN` | When truthy, certain scripts (e.g., migrations) execute in dry-run mode without persisting changes. |
| `VITEST_ENABLE_COVERAGE` | Enable code coverage output when running the Vitest suite. |
| `BASE_URL` | Overrides the Playwright test base URL (defaults to `http://localhost:5173`). |

### Analytics verification knobs

Use these to tune `npm run verify:analytics:heatmap` when exercising the materialized views locally or against staging data.

| Name | Purpose |
| --- | --- |
| `HEATMAP_VERIFY_RETRY_BASE_MS` | Milliseconds to wait before retrying failed Supabase requests (exponential backoff base). |
| `HEATMAP_VERIFY_CONCURRENCY` | Number of concurrent verification batches. |
| `HEATMAP_VERIFY_BATCH` | Max number of question responses processed per batch. |
| `HEATMAP_VERIFY_QUESTIONS` | Total number of synthetic questions to seed for the verification run. |
| `HEATMAP_VERIFY_USERS` | Total number of synthetic users created for analytics verification. |
| `HEATMAP_VERIFY_NON_PROD_HOSTS` | Comma-separated allowlist of hostnames considered non-production for the verification script. |
| `HEATMAP_VERIFY_PROD_HOSTS` | Comma-separated list of hostnames flagged as production (enables extra safeguards). |
| `HEATMAP_VERIFY_ALLOW_PROD` | Must be `true` to run the verification script against production Supabase projects. |

### Local infrastructure (Docker Compose)

These variables populate the Postgres service defined in `docker-compose.yml`. Copy `.env.example` at the repository root to `.env` to get started.

| Name | Purpose | Where to set |
| --- | --- | --- |
| `POSTGRES_DB` | Database name created for the local Postgres container. | `.env` at the repo root. |
| `POSTGRES_USER` | Admin user provisioned for local Postgres. | `.env` at the repo root. |
| `POSTGRES_PASSWORD` | Password for the admin user. | `.env` at the repo root. |

## Recommended workflows

### Local development
1. Copy the repository root `.env.example` to `.env` when using Docker Compose, Makefile shortcuts, or scripts that expect the `POSTGRES_*` defaults.
2. Duplicate `chd-qbank/.env.example` to the appropriate `.env` files (`.env.development`, `.env.staging`, etc.).
3. Populate the Supabase URL and anon key. Leave the invite placeholders untouched.
4. Run `npm install` followed by `npm run dev` from `chd-qbank/`.

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
# Add INVITE_CODE_SALT="<hex-salt>" if you need the hashed invite to remain stable across runs.
```

Rotate invite codes immediately if the values are ever exposed (logs, screenshots, or accidental commits).

### Hosted deployments

* **Vercel:** Only configure the `VITE_*` variables. Service-role keys must never live in the frontend environment.
* **Supabase Edge Functions:** Provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` through the Supabase dashboard or your secret manager.
* **Continuous integration:** Export the service-role key just-in-time for migrations or verification scripts. Store secrets in the CI provider’s secure storage.

For additional operational context, see the [release runbook](../ops/release-runbook.md).

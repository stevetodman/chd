# Supabase verification appendix

Use this appendix whenever a runbook instructs you to execute Supabase SQL, call RPCs, or run automation scripts. It centralizes the connection methods, required environment variables, and smoke tests so each guide can stay concise.

## Connecting to Supabase

Choose the method that matches your access level:

- **Supabase SQL editor:** Browser-based console suitable for quick queries in staging environments. Requires project dashboard access.
- **`supabase db remote psql`:** Shell access that tunnels through the Supabase CLI. Use when you need to run migrations or scripts saved in the repository. Example:
  ```bash
  supabase link --project-ref <project-ref>
  supabase db remote psql --db-url postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
  ```
- **Direct `psql`:** Use if you operate through a bastion or already have the database URL from the dashboard.

Always connect with the lowest privilege account that still allows the task (service-role for maintenance scripts, read-only for audits).

## Environment variables for automation scripts

Many scripts under `scripts/` and `npm run verify:*` rely on the same environment variables:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project base URL (`https://<ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for RPC calls and seeding. |
| `SUPABASE_ANON_KEY` | Optional when a script tests authenticated flows. |
| `HEATMAP_VERIFY_USERS`, `HEATMAP_VERIFY_QUESTIONS`, `HEATMAP_VERIFY_BATCH` | Optional overrides used by the analytics verification script. |

Load them from `.env` or export them inline when invoking a command:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run verify:analytics:heatmap -- --dry-run
```

## Standard verification flow

Follow these checks before and after schema changes or credential rotations:

1. **Connectivity probe:**
   ```bash
   supabase status
   ```
   Confirms the CLI is linked to the target project.
2. **Policy sanity check:** Run the RPC or SQL function referenced by the runbook using the service-role key. Example:
   ```sql
   select * from app.prune_old_events(250);
   select analytics_heatmap_admin() limit 5;
   ```
   Ensure the results match expectations and respect row-level security constraints.
3. **Automation scripts:** Execute the task-specific scripts (e.g., `npm run verify:analytics:heatmap`). Review the output for performance regressions, permission errors, or warnings about production safeguards (`--allow-prod`).
4. **Cleanup confirmation:** Re-run the RPCs with `--dry-run` or validation flags when available to confirm no residual data remains.

## Production safety switches

Certain scripts and functions include guardrails:

- `--dry-run` performs authentication and schema checks without mutating data.
- `--allow-prod` must be passed explicitly before scripts will operate on production hosts.
- Service worker, analytics, and event retention jobs log to Supabase and Cloud logs; review them after each run for anomalies.

Only disable these guardrails with approval from the incident commander or release lead.

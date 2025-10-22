# CHD QBank

A static-first CHD-focused tutor platform bundling a Step-1 style question bank with two learning games. This scaffold pairs Vite + React with Supabase Auth, Postgres, and Storage. It includes invite-only signup enforced via a Supabase Edge Function, fully RLS-protected schemas, and admin tooling for analytics and item management.

## Prerequisites

- Node.js 18+
- npm 9+
- Access to a Supabase project (development and/or production)
- An invite code issued through the Supabase Edge Function

## Getting Started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and populate with the Supabase project URL and anon key. If you are working with multiple environments, commit only the example file—never your secrets.

The development server runs at [http://localhost:5173](http://localhost:5173). Sign in with an account that has been invited through the Supabase Edge Function to access gated routes.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Build the static assets. |
| `npm run preview` | Preview the production build. |
| `npm run lint` | Run ESLint against the source tree. |
| `npm run test` | Run Vitest (placeholder suite). |
| `npm run seed:invite` | Upsert invite codes into `app_settings` using service-role credentials. |

## Supabase Setup

1. Create development and production Supabase projects.
2. Run `schema.sql`, `storage-policies.sql`, and `cron.sql` in the SQL editor.
3. Deploy the `signup-with-code` Edge Function and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the function environment.
4. Create storage buckets: `murmurs`, `cxr`, `ekg`, `diagrams`.
5. Configure SMTP (Resend) inside Supabase; no client key is required.
6. To rotate invite access, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INVITE_CODE`, and `INVITE_EXPIRES` in your environment (or `.env`) and run `npm run seed:invite` to upsert the current values into `app_settings`.
7. Review [`docs/analytics/heatmap.md`](../docs/analytics/heatmap.md) for guidance on the admin heatmap materialized view and refresh routines.

## Deployment

Use Vercel Hobby for static hosting and point preview environments to the dev Supabase project. Production should use Supabase Pro to enable `pg_cron` and other advanced features. After promoting a build, refresh materialized views and rotate invite codes as needed.

## Testing

The scaffold ships with a minimal Vitest setup; add integration tests as features land. Run tests and lint before committing changes, and document the commands you executed in your pull request.

For documentation-only updates, note the exemption in the PR template and briefly explain the reason.

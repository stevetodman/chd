# CHD – Congenital Heart Disease Tutor Platform

This repository hosts the code and infrastructure assets for the **CHD QBank**—a congenital heart disease learning platform that combines a Step 1–style question bank with teaching games for cardiology trainees. It is structured as a Vite + React single page application backed by Supabase for authentication, data storage, and scheduled jobs.

## Repository Layout

| Path | Description |
| --- | --- |
| `chd-qbank/` | The primary web application, including frontend source code, configuration, and Supabase assets. |
| `schema.sql`, `storage-policies.sql`, `cron.sql` | Supabase SQL migrations for database schema, storage rules, and scheduled tasks. |
| `import_template.csv` | CSV scaffold for bulk question imports. |

## Features

- Invite-only Supabase authentication powered by an Edge Function.
- Modular question bank with analytics and item-management tooling.
- Learning games that reuse the shared content library.
- Fully RLS-protected Postgres schema with storage buckets for media (murmurs, CXR, EKG, diagrams).
- Static-first deployment strategy suitable for Vercel hosting.

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- A **Supabase** project for both development and production environments.

## Quick Start

```bash
cd chd-qbank
npm install
npm run dev
```

Copy `.env.example` to `.env` and provide the Supabase project URL and anon key before starting the development server.

## Available Scripts

All commands are executed from the `chd-qbank` directory.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on [http://localhost:5173](http://localhost:5173). |
| `npm run build` | Produce an optimized production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint on the TypeScript/React source files. |
| `npm run test` | Execute the Vitest unit test suite (placeholder coverage). |

## Supabase Setup

1. Create Supabase projects for development and production.
2. Run `schema.sql`, `storage-policies.sql`, and `cron.sql` in the Supabase SQL editor.
3. Deploy the `signup-with-code` Edge Function contained in `supabase/functions/signup-with-code` and configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables for the function.
4. Create storage buckets named `murmurs`, `cxr`, `ekg`, and `diagrams`.
5. Configure SMTP (e.g., Resend) inside Supabase; no client key is required.

## Environment Variables

Create an `.env` file in `chd-qbank/` with the following values:

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Additional secrets (such as service role keys) should be stored securely and provided only to server-side contexts like Edge Functions.

## Development Workflow

1. Branch from `main` and ensure dependencies are installed.
2. Make changes within `chd-qbank/src` and associated Supabase SQL files.
3. Run `npm run lint` and `npm run test` before committing feature or bugfix changes.
4. Format documentation updates manually (no automated formatter is provided).
5. Open a pull request describing the change and include screenshots for UI adjustments when possible.

## Deployment

1. Deploy the static assets to Vercel (Hobby tier is sufficient for previews).
2. Configure preview deployments to point to the development Supabase project.
3. Promote builds to production once Supabase Pro features (such as `pg_cron`) are available.

## Contributing

Contributions are welcome! Please open an issue before submitting major features or architecture changes. Bugfix pull requests should include reproduction steps, screenshots (for UI changes), and tests when applicable.

## Future Work

- Expand automated testing coverage beyond the placeholder Vitest suite to ensure the question bank and game flows behave reliably.
- Prototype richer game interactions that deepen clinical reasoning practice while reusing the shared content library.
- Harden offline capabilities so the learning experience remains functional with intermittent connectivity.

## License

This project is licensed under the terms of the [MIT License](./LICENSE).

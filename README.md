# CHD – Congenital Heart Disease Tutor Platform

This monorepo packages everything required to operate the **CHD QBank**: a congenital heart disease learning platform that combines a Step 1–style question bank, imaging and auscultation games, scheduled jobs, and automation. The primary web client is a Vite + React single-page application backed by Supabase for authentication, storage, and analytics. SQL migrations, operational scripts, and documentation live alongside the app so new contributors can bootstrap the environment quickly.

## Quick start

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/<your-org>/chd.git
   cd chd/chd-qbank
   npm install
   ```

2. Copy `.env.example` to `.env` and populate Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Automation helpers require the additional service-role variables documented in [`ENV.md`](./ENV.md).

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with an invited account. Seed content and invite codes using the scripts referenced in the [release & operations guide](./docs/ops/release-operations.md).

## Repository highlights

| Area | Key resources |
| --- | --- |
| Frontend & Supabase assets | [`chd-qbank/`](./chd-qbank) houses the React app, SQL migrations, automation scripts, and tests. |
| Operational playbooks | The [`docs/`](./docs) directory collects analytics, security, runtime, and compliance references. Start with the [documentation index](./docs/README.md) for task-specific guidance. |
| Contributor workflow | [`CONTRIBUTING.md`](./CONTRIBUTING.md) outlines branching, testing, and review expectations. |
| Security reporting | [`SECURITY.md`](./SECURITY.md) explains disclosure channels and response timelines. |

## Development essentials

- **Prerequisites:** Node.js 18+, npm 9+, and access to a Supabase project (maintain separate development and production projects when possible).
- **Core scripts:** Run commands from `chd-qbank/`:

  | Command | Purpose |
  | --- | --- |
  | `npm run dev` | Launch the Vite development server on [http://localhost:5173](http://localhost:5173). |
  | `npm run build` | Produce a production bundle in `dist/`. |
  | `npm run lint` / `npm run test` | Execute linting and Vitest suites before opening a feature PR. |
  | `npm run seed:full` / `npm run seed:invite` | Synchronize Supabase content and invite codes using service-role credentials. |
  | `npm run verify:seed` / `npm run verify:analytics:heatmap` | Validate database state and analytics materialized views after deployments. |

- **Environment variables:** `ENV.md` is the single source of truth for required and optional variables, including where each value should be configured.

- **Data model overview:** Supabase tables, functions, and materialized views are defined in [`chd-qbank/schema.sql`](./chd-qbank/schema.sql). Analytics helpers, Row Level Security, and automation entry points are annotated throughout the file.

## Operations & deployment

- Follow the consolidated [release & operations guide](./docs/ops/release-operations.md) for environment promotion, rehearsal checklists, verification steps, and rollback procedures.
- Deployment targets (Vercel + Supabase) are configured via [`vercel.json`](./vercel.json) and the Supabase project settings referenced in the operations guide.
- Update documentation and Supabase migrations when making schema or policy changes; automation scripts depend on both staying in sync.

## Further reading

- Browse the [documentation index](./docs/README.md) for analytics, runtime, compliance, and onboarding references.
- Review the [documentation content style checklist](./docs/documentation-content-style-checklist.md) before submitting substantial doc updates.

## License

This project is licensed under the [MIT License](./LICENSE).

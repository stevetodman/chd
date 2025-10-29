# Installation guide

This guide walks through the full setup required to run the Congenital Heart Disease Tutor Platform locally. Follow each step in
order—by the end you will have a Supabase project seeded with starter data and a Vite development server running on
`http://localhost:5173`.

## Prerequisites

- Git
- Node.js 18 LTS or 20 LTS (use `nvm`/`asdf` to match the versions in `.nvmrc` / `.tool-versions`)
- npm 9+
- A Supabase account with permission to create projects and deploy Edge Functions

> 📝 Tip: Keep development and production Supabase projects separate so you can iterate safely.

## 1. Clone the repository

```bash
git clone https://github.com/<your-org>/chd.git
cd chd
```

## 2. Install Node.js and dependencies

1. Install the pinned Node.js version:

   ```bash
   nvm install
   nvm use
   ```

   or, if you use `asdf`:

   ```bash
   asdf install
   ```

2. Install workspace dependencies:

   ```bash
   cd chd-qbank
   npm install
   ```

## 3. Create and initialize a Supabase project

1. Create a new Supabase project from the dashboard. Record the project URL and anon/service-role keys.
2. Load the database schema and automation helpers by running the following SQL files in the Supabase SQL editor (or via
   `supabase db push`):

   - `schema.sql`
   - `storage-policies.sql`
   - `cron.sql`

3. Deploy the invite Edge Function:

   ```bash
   supabase functions deploy signup-with-code --project-ref <your-project-ref>
   ```

   The source lives in `chd-qbank/supabase/functions/signup-with-code`. After deployment, set the function environment variables
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` inside the Supabase dashboard so it can validate invite codes.

4. Create the required storage buckets under **Storage → Buckets**:

   - `murmurs`
   - `cxr`
   - `ekg`
   - `diagrams`

5. Configure email delivery under **Authentication → Email → SMTP Settings** so invite and password reset emails function.

## 4. Configure environment variables locally

1. Copy the example environment file:

   ```bash
   cp .env.example .env.development
   ```

2. Edit `.env.development` (or `.env`) and set the following values:

   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>

   # Optional: required only when running automation scripts locally
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

   Keep invite codes out of the committed file—these are injected at runtime when running seeding scripts.

## 5. Seed starter data (optional but recommended)

Populate the project with practice questions, media, and analytics fixtures:

```bash
npm run seed:full
```

The script provisions a default administrator (`admin@example.com` / `Admin123!`). Sign in with this account after seeding and
immediately rotate the password in Supabase Auth.

To register an invite code for new learners, supply the values inline when running the script:

```bash
INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" npm run seed:invite
```

## 6. Run the application locally

Start the Vite development server and open the app in your browser:

```bash
npm run dev
```

Navigate to [http://localhost:5173](http://localhost:5173) and sign in with the seeded admin account or a user that redeemed an
invite code.

## 7. Common follow-up commands

| Command | Description |
| --- | --- |
| `npm run lint` | Run ESLint checks before submitting a pull request. |
| `npm run test` | Execute the Vitest unit and integration suite. |
| `npm run preview` | Serve the production build locally (after `npm run build`). |
| `npm run verify:seed` | Validate that seeded data matches the templates in `data/templates/`. |

Refer to [`chd-qbank/README.md`](../chd-qbank/README.md) for deeper operational details, deployment guidance, and the complete
list of workspace scripts.

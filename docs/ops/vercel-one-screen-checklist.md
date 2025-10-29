# Vercel Deployment One-Screen Checklist

- Root directory: `./` (monorepo root contains `package.json` and `vercel.json`).
- Build command: `npm run build` (uses workspace scripts to compile the app).
- Output directory: `dist/` (confirm Vercel points to the built static assets).
- Node.js version: set `"node": "18.x"` in Vercel Project Settings → Environment → Node Version.
- Environment variables: verify all `NEXT_PUBLIC_*`, `SUPABASE_*`, and API keys exist in Vercel for all environments.
- Supabase CORS: ensure Supabase project allows the Vercel domain (Preview + Production) under Authentication → URL Configuration.
- `vercel.json`: confirm rewrites point `/api/*` and other routes to the correct origins.
- Local dry run: `npx vercel build --prebuilt` succeeds from a clean checkout.
- Smoke tests: hit `/`, `/login`, `/api/health`, and Supabase-dependent pages after deploy.

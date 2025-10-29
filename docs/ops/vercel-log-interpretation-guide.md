# Vercel Build Log Troubleshooter

Use this guide to translate the most common build-log failures for the CHD QBank deployment on Vercel into quick fixes.

## Wrong project root
- **Log cue:** `npm ERR! Missing script: "build"` right after Vercel runs the default `npm run build`.
- **Fastest fix:** In the Vercel dashboard, set **Project → Settings → General → Root Directory** to `chd-qbank/`, or override the Build Command to `npm --prefix chd-qbank run build` so Vercel builds the workspace app instead of the monorepo root.

## Missing `dist` output
- **Log cue:** `Error: The specified output directory "dist" does not exist.` (sometimes worded as `No Output Directory named "dist" found after the Build completed.`)
- **Fastest fix:** Make sure the build runs with `npm --prefix chd-qbank run build` and that it succeeds locally. Re-run the build after fixing any preceding errors so that `chd-qbank/dist/` is emitted.

## Node.js version mismatch
- **Log cue:** `Error: Node.js version X is required, but Y is running` or `The "engines" field in package.json requires Node.js X`.
- **Fastest fix:** Set **Project → Settings → Build & Development Settings → Node.js Version** to `18.x` (the version documented in the repo prerequisites) or add `"engines": { "node": "18.x" }` to `chd-qbank/package.json`, then redeploy.

## Environment variable compilation failures
- **Log cue:** `Error: Missing required environment variables: VITE_SUPABASE_URL or SUPABASE_URL, VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.` (surfaced from `src/config.ts` during the Vite build.)
- **Fastest fix:** Add the Supabase URL and anon key to **Project → Settings → Environment Variables** for Production, Preview, and Development (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). Re-deploy once both variables are present.

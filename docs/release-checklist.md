# chd-qbank Release Checklist

1. **Confirm Version Bump**
   - Determine if the release introduces user-visible changes that require a semantic version bump in `package.json` and `package-lock.json`.
   - Update change logs (e.g., `RELEASE.md`) and ensure tags and release notes reflect the new version.
2. **Local Build Verification**
   - Install dependencies with `npm install` (or `npm ci` in CI contexts).
   - Run `npm run build` locally to confirm the build succeeds without warnings.
3. **CLI Dry-Run**
   - Execute the relevant CLI release command (e.g., `npm run deploy -- --dry-run` or equivalent script) to validate configuration and artifact generation without performing a live deploy.
   - Capture output and confirm there are no blocking warnings or missing assets.
4. **Environment Variable Audit**
   - Cross-check required variables documented in `ENV.md`, ensuring they are populated in `.env.production`, Vercel project settings, and any CI/CD secrets vault.
   - Verify no unexpected diffs between staging and production configurations.
5. **Supabase CORS Validation**
   - Review Supabase project CORS settings to confirm the production domain(s) are listed and staging domains are not accidentally included.
   - Ensure any new routes or subdomains introduced in this release are covered.
6. **Deploy**
   - Trigger the production deployment via the approved path (e.g., `npm run deploy` or Vercel dashboard) once previous checks pass.
   - Monitor deployment logs for errors or regressions.
7. **Post-Deploy Route Checks**
   - Manually navigate to key routes (dashboard, question bank, auth flows, API endpoints) verifying expected responses and UI rendering.
   - Confirm new or modified routes return valid responses and respect authentication/authorization rules.
8. **Console Errors Review**
   - Inspect browser developer tools and server logs for errors or warnings immediately after deployment.
   - Address any anomalies before declaring the release complete.
9. **Rollback Preparedness**
   - Confirm the previous stable build is accessible for rollback (e.g., Vercel deployment history or Git tags).
   - Document rollback steps and criteria; notify stakeholders once either release acceptance or rollback is finalized.

# Supabase credential rotation runbook

When Supabase service-role or anon keys are exposed, rotate them immediately to prevent unauthorized access. Follow this workflow for each environment (staging, production, review apps).

## Prerequisites

- Access to the Supabase project dashboard with Owner or Admin permissions.
- Access to the Vercel (or equivalent) environment variables used by the deployment.
- GitHub Actions or other automation secrets management permissions.

## Rotation steps

1. **Confirm scope.** Identify which credentials leaked (service-role key, anon key, JWT secret, webhook secrets). Check application logs for suspicious activity during the suspected exposure window.
2. **Generate new keys.** In the Supabase dashboard, open *Settings → API* and click **Generate new key** for each affected value. Copy the replacements immediately; Supabase will only show them once.
3. **Update secret stores.**
   - Vercel: Update the corresponding Environment Variables (`SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, etc.) for every environment and trigger redeploys.
   - GitHub Actions: Update `Settings → Secrets and variables → Actions` for the repository and any shared organization secrets.
   - Local automation: Notify the team to refresh `.env` files and password managers storing the rotated values.
4. **Redeploy and invalidate caches.** Trigger production and staging deployments so new builds bundle the rotated anon key. Invalidate CDN caches if downstream services cached responses with embedded keys.
5. **Verify access.** Follow the [Supabase verification appendix](./supabase-verification.md) to run smoke tests (`supabase status`, critical RPCs, and the analytics verification script) using the new credentials.
6. **Revoke old keys.** Supabase disables the previous keys automatically, but confirm that scripts and functions no longer authenticate with the old values.
7. **Document the incident.** Record the rotation in the internal change log: which keys were rotated, affected environments, triggering incident number, and verification timestamp.

## Communication checklist

- Notify on-call engineers and stakeholders that the rotation is complete.
- If user data may have been exposed, coordinate disclosure with the security and compliance leads.
- Ensure follow-up actions (e.g., incident postmortem, automation improvements) are tracked in GitHub issues.

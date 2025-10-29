# Vercel Rollback / Roll-Forward Playbook

1. Confirm the production incident and note the affected deployment URL from the Vercel dashboard (https://vercel.com/dashboard) or `vercel ls`.
2. Locate the last known good deployment by opening the "Deployments" tab of the project in Vercel; copy the immutable URL (`https://<hash>.vercel.app`).
3. Validate that the good deployment passes smoke tests (e.g., open key pages, run quick API checks) to ensure it resolves the incident.
4. Re-alias production to the good deployment with `vercel alias set <hash>.vercel.app <prod-domain>`; confirm the alias change in the dashboard.
5. Communicate in incident channels that production now points to the rollback deployment and keep monitoring key metrics/logs.
6. Branch from the hotfix point (`git checkout -b hotfix/<ticket> <last-good-commit>`) or cherry-pick fixes onto the mainline branch.
7. Implement the hotfix, add regression tests, and verify locally (run unit/integration tests, lint, and manual checks as needed).
8. Deploy the hotfix with `vercel --prod` (or CI pipeline) and monitor the new deployment URL for errors.
9. Once validated, move the production alias back to the new deployment using `vercel alias set <new-hash>.vercel.app <prod-domain>`.
10. Close the incident by updating status communications, documenting the root cause, and scheduling any follow-up tasks.

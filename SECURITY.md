# Security Policy

We take the security of the CHD project seriously and appreciate your efforts to responsibly disclose vulnerabilities. The information below outlines supported versions, how to report issues, and what to expect from our team.

## Supported Versions
Security fixes will be applied to the latest stable release and the main development branch. Older versions may not receive patches.

## Reporting a Vulnerability
If you discover a security vulnerability, please use the [private GitHub security advisory form](https://github.com/clinical-data-health/chd/security/advisories/new) or email [security@clinicalhemodynamics.dev](mailto:security@clinicalhemodynamics.dev). Include:
- A description of the vulnerability and its potential impact (e.g., data exposure, privilege escalation).
- Steps to reproduce the issue, including affected routes or API endpoints.
- Any relevant logs, screenshots, or proof-of-concept exploits.
- Your preferred timeline for coordinated disclosure, if applicable.

Please do not publicly disclose the vulnerability until we have had an opportunity to investigate and provide a fix. The inbox and advisory queue are monitored daily; urgent submissions trigger an on-call escalation.

## Response Process
1. We will acknowledge receipt of your report within 3 business days.
2. Our team will investigate and verify the issue.
3. We will work on a fix and coordinate a release schedule with you when appropriate.
4. We will notify Supabase support if the issue involves managed infrastructure or service-role credentials and follow the [Supabase credential rotation runbook](docs/ops/supabase-credential-rotation.md) for any impacted keys.
5. Once a fix is available, we will credit you for the discovery (unless you prefer to remain anonymous) and publish an advisory.

## Additional Guidance

- Never include real patient data or personally identifiable information in reproduction steps.
- If the vulnerability requires credential rotation (e.g., Supabase service role keys), indicate which secrets were potentially exposed so we can rotate them promptly using the [credential rotation runbook](docs/ops/supabase-credential-rotation.md).
- For urgent issues outside normal business hours, mark the email subject line with `URGENT` so it is escalated automatically.

## Handling invite codes and other sensitive configuration

- Invite codes are provisioned out-of-band. Inject them via environment variables (for example `INVITE_CODE="<secure-value>" INVITE_EXPIRES="2025-12-31" npm run --prefix chd-qbank seed:invite`) instead of storing them in Git, issue trackers, or chat logs.
- Store long-lived secrets (Supabase service role keys, production invite codes) in an encrypted secret manager and scope access narrowly.
- Rotate invite codes immediately whenever exposure is suspected. Historical commits in this repository exposed a legacy invite code—assume any pre-2024-09 values are compromised and replace them in every environment.
- Document rotations in the internal change log so downstream operators know which environments were updated and which codes are no longer valid.

Thank you for helping to keep the CHD community safe.

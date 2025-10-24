# Security Policy

We take the security of the CHD project seriously and appreciate your efforts to responsibly disclose vulnerabilities. The information below outlines supported versions, how to report issues, and what to expect from our team.

## Supported Versions
Security fixes will be applied to the latest stable release and the main development branch. Older versions may not receive patches.

## Reporting a Vulnerability
If you discover a security vulnerability, please email us at [security@example.com](mailto:security@example.com) with the following information:
- A description of the vulnerability and its potential impact (e.g., data exposure, privilege escalation).
- Steps to reproduce the issue, including affected routes or API endpoints.
- Any relevant logs, screenshots, or proof-of-concept exploits.
- Your preferred timeline for coordinated disclosure, if applicable.

Please do not publicly disclose the vulnerability until we have had an opportunity to investigate and provide a fix.

## Response Process
1. We will acknowledge receipt of your report within 3 business days.
2. Our team will investigate and verify the issue.
3. We will work on a fix and coordinate a release schedule with you when appropriate.
4. We will notify Supabase support if the issue involves managed infrastructure or service-role credentials.
5. Once a fix is available, we will credit you for the discovery (unless you prefer to remain anonymous) and publish an advisory.

## Additional Guidance

- Never include real patient data or personally identifiable information in reproduction steps.
- If the vulnerability requires credential rotation (e.g., Supabase service role keys), indicate which secrets were potentially exposed so we can rotate them promptly.
- For urgent issues outside normal business hours, mark the email subject line with `URGENT` so it is escalated automatically.

## Related documentation

- Platform hardening and admin procedures are documented in [`docs/security`](./docs/security).
- Operational expectations for contributors are outlined in the [README](./README.md) and [CONTRIBUTING](./CONTRIBUTING.md) guides.
- Public builds include the latest version of this policy in the repository root for easy discovery.

Thank you for helping to keep the CHD community safe.

# Security Policy

We take the security of the CHD project seriously and appreciate your efforts to responsibly disclose vulnerabilities. The information below outlines supported versions, how to report issues, and what to expect from our team.

## Supported Versions
Security fixes will be applied to the latest stable release and the main development branch. Older versions may not receive patches.

## Reporting a Vulnerability
If you discover a security vulnerability, please email us at [security@chdqbank.org](mailto:security@chdqbank.org) or open a private [Security Advisory draft](https://github.com/<your-org>/chd/security/advisories/new) with the following information:
- A description of the vulnerability and its potential impact (e.g., data exposure, privilege escalation).
- Steps to reproduce the issue, including affected routes or API endpoints.
- Any relevant logs, screenshots, or proof-of-concept exploits.
- Your preferred timeline for coordinated disclosure, if applicable.

Please do not publicly disclose the vulnerability until we have had an opportunity to investigate and provide a fix.

## Response Process
1. We will acknowledge receipt of your report within **one business day** (and within **12 hours** for reports marked `URGENT`).
2. Our team will investigate and verify the issue, providing an initial assessment and next steps within **three business days**.
3. We will work on a fix and coordinate a release schedule with you; critical vulnerabilities target remediation within **seven calendar days** of confirmation.
4. We will notify Supabase support if the issue involves managed infrastructure or service-role credentials and rotate affected secrets as part of containment.
5. Once a fix is available, we will credit you for the discovery (unless you prefer to remain anonymous) and publish an advisory.

## Additional Guidance

- Never include real patient data or personally identifiable information in reproduction steps.
- If the vulnerability requires credential rotation (e.g., Supabase service role keys), indicate which secrets were potentially exposed so we can rotate them promptly.
- For urgent issues outside normal business hours, mark the email subject line with `URGENT` so it is escalated automatically.

Thank you for helping to keep the CHD community safe.

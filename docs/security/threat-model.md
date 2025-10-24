# CHD QBank Threat Model

## Assets
- **Protected health information (PHI) avoidance** – While PHI is prohibited in gameplay data, any uploaded or inferred clinical notes would be highly sensitive and must be treated as regulated data. Policies and UI copy explicitly warn users not to upload PHI. 【F:chd-qbank/src/pages/Terms.tsx†L17-L21】【F:chd-qbank/src/pages/Privacy.tsx†L16-L20】
- **Invite codes and onboarding metadata** – Supabase configuration stores invite tokens and expiry dates that gate account creation. These secrets control who can join the platform. 【F:chd-qbank/README.md†L33-L70】
- **Authentication credentials and aliases** – Supabase Auth identities, stored aliases, and role assignments determine access to content and admin capabilities. Policies in Postgres protect this information. 【F:chd-qbank/schema.sql†L1-L120】【F:chd-qbank/schema.sql†L410-L455】

## Adversaries
- **Curious students or unauthorized users** attempting to register without invites or escalate privileges to access restricted analytics.
- **Compromised administrators** whose elevated privileges or phishing compromises could modify content, settings, or expose telemetry.
- **External attackers** seeking to breach Supabase services, steal stored media, or harvest credentials via API misuse.
- **Supply-chain actors** abusing dependencies or CI/CD integrations to introduce malicious code or exfiltrate secrets.

## Trust Boundaries
- **Browser ↔ Supabase APIs** – The SPA communicates with Supabase over HTTPS using anon or session tokens. RLS policies enforce per-user visibility even inside trusted browser sessions. 【F:chd-qbank/schema.sql†L410-L455】
- **Edge Functions ↔ Postgres** – The `signup-with-code` edge function runs with service-role credentials to create users. Idempotency storage and invite hashing mitigate replay across this elevated trust boundary. 【F:chd-qbank/supabase/functions/signup-with-code/index.ts†L1-L160】
- **Automation scripts ↔ Supabase service role** – Seeding and verification scripts require service-role keys and therefore must run in controlled CI or admin environments. 【F:chd-qbank/README.md†L33-L111】
- **CI/CD workflows ↔ repository secrets** – GitHub Actions access tokens and Supabase credentials; workflows enforce least privilege through scoped jobs and secret scanning. 【F:.github/workflows/ci.yml†L1-L200】【F:.github/workflows/secret-scan.yml†L1-L200】

## Existing Controls
- **Row Level Security (RLS)** policies on Supabase tables restrict read/write access to authenticated users and admins based on JWT claims. 【F:chd-qbank/schema.sql†L410-L455】
- **Invite-only signup** enforced by the `signup-with-code` edge function validates hashed codes, generates aliases, and stores idempotent responses to prevent brute force. 【F:chd-qbank/supabase/functions/signup-with-code/index.ts†L1-L160】
- **Type checking** runs via `npm run typecheck` (`tsc --noEmit`) to catch unsafe client and script usage during development and CI. 【F:chd-qbank/package.json†L6-L28】
- **Secret scanning** GitHub Action monitors pushes and pull requests for leaked credentials. 【F:.github/workflows/secret-scan.yml†L1-L200】
- **SBOM and license inventory generation** uses `npm run notice` to build `docs/compliance/license-inventory.json`, providing auditable dependency metadata for releases. 【F:chd-qbank/scripts/generate-notice.mjs†L1-L160】【F:docs/compliance/license-inventory.json†L1-L20】

## Recommended Improvements
- **Automated HIPAA/GDPR scanners** – Integrate static analysis to detect PHI patterns in uploads or logs, complementing user-facing warnings.
- **Content Security Policy (CSP) hardening** – Ship strict CSP headers (nonce-based for Supabase auth callbacks) to reduce XSS risk in the SPA deployment.
- **Runtime monitoring** – Add anomaly detection on Supabase (e.g., pgAudit, log ingestion) and frontend telemetry to surface unusual access patterns.
- **Regular penetration testing** – Schedule third-party assessments covering the SPA, Supabase policies, and automation scripts to validate controls.
- **Edge function coverage** – Expand automated tests validating invite throttling, lockout, and alias uniqueness regression scenarios.
- **Dependency auditing pipeline** – Extend SBOM workflow with CycloneDX exports and vulnerability scanning to reinforce supply-chain defenses.

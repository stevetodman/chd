# Security audit – 2024-08-30

## Overview
- **Scope:** Reviewed the entire `chd-qbank` application, including Supabase database migrations, Edge Function logic, React client code, build configuration, and deployment headers.
- **Methodology:** Manual code review with a focus on authentication, authorization, data exposure, and supply-chain risks. No automated penetration testing tools were executed in this pass.
- **Key risks identified:** Exposed invite secret, account creation without email verification, unauthenticated access to signup idempotency logs, and weakened Content Security Policy.

## Findings

### 1. Hard-coded invite code secret (High)
The Supabase schema seeds the `app_settings` table with a static invite code (`CHD2025FALL`) and expiration date. Because this migration is part of the public repository, anyone can recover the code and pair it with the publicly exposed Supabase project URL to self-enroll via the signup Edge Function.【F:chd-qbank/schema.sql†L91-L103】

**Impact:** Unauthorized users can bypass the intended invite-only onboarding and generate verified accounts, gaining access to protected study material.

**Recommendation:** Remove secrets from migrations and provision them at deploy time (e.g., environment-specific seeds or encrypted secrets management). Rotate any invite codes that may already be in circulation.

**Status (2024-09-15 update):** Mitigated pending production verification. Migration `20240915000000_secure_signup_hardening` deletes the seeded invite code so the secret must now be provisioned through out-of-band configuration at deploy time.【F:chd-qbank/supabase/migrations/20240915000000_secure_signup_hardening.sql†L1-L14】 Confirm the change is deployed to all environments and that replacement secrets are stored outside version control before closing the finding.

### 2. Email verification bypass during signup (High)
The `signup-with-code` Edge Function calls `sb.auth.admin.createUser` with `email_confirm: true`, meaning newly created accounts are marked as verified without requiring users to prove ownership of the email address.【F:chd-qbank/supabase/functions/signup-with-code/index.ts†L208-L249】 Combined with the exposed invite code, an attacker can register arbitrary email addresses and immediately log in with the chosen password, potentially locking out legitimate students.

**Impact:** Enables account takeover and eliminates the assurance that verified accounts correspond to real students.

**Recommendation:** Require email confirmation flows for self-service signups. If immediate access is necessary, consider issuing time-limited magic links or enforcing secondary verification steps managed by administrators.

### 3. Missing RLS on `idempotency_keys` exposes signup metadata (High)
The `idempotency_keys` table stores serialized HTTP responses from the signup function, including the generated alias and Supabase user ID.【F:chd-qbank/schema.sql†L54-L58】【F:chd-qbank/supabase/functions/signup-with-code/index.ts†L114-L260】 However, unlike other tables, row level security is never enabled for `idempotency_keys`, leaving it governed by Supabase’s default grants to the `anon`/`authenticated` roles.【F:chd-qbank/schema.sql†L318-L333】 Any authenticated client can therefore read or tamper with idempotency records, learning about signups or forcing the function to replay stale responses.

**Impact:** Authenticated users can monitor invite usage, enumerate newly created user IDs, or corrupt idempotency state to interfere with signups.

**Recommendation:** Enable RLS on `idempotency_keys` and restrict access to the service role (e.g., `alter table ... enable row level security;` plus policies that only allow the Edge Function to read/write).

**Status (2024-09-15 update):** Mitigated pending production verification. Migration `20240915000000_secure_signup_hardening` now enables RLS on `idempotency_keys` and installs a service-role-only policy, limiting access to the Edge Function once deployed.【F:chd-qbank/supabase/migrations/20240915000000_secure_signup_hardening.sql†L5-L13】 Validate that the migration has run and that no additional policies grant broader access before closing the finding.

### 4. CSP allows inline scripts (Medium)
The production `vercel.json` config sets `script-src 'self' 'unsafe-inline'`, which permits inline scripts on every page.【F:vercel.json†L1-L13】 This negates CSP’s protection against cross-site scripting because any reflected or stored XSS payload can execute inline.

**Impact:** In the event of an injection flaw elsewhere, CSP will not block malicious inline JavaScript, increasing the likelihood of account compromise.

**Recommendation:** Remove `'unsafe-inline'` from `script-src`. If inline scripts are required, replace them with hashed or nonce-based CSP directives generated at build time.

## Additional observations
- Consider adding rate limiting or challenge mechanisms to the signup Edge Function to slow automated abuse once the invite secret is rotated.
- Review the Content Security Policy for other allowances (e.g., `'unsafe-inline'` for styles) and tighten where possible after testing.

# CHD QBank Partial Audit (2024-07-02)

> **Scope note:** This document captures the highest-impact findings that could be validated within the time allotted. Sections are intentionally concise; items marked "Deferred" require deeper inspection during a follow-up audit.

## 0) Executive Summary
The CHD QBank stack combines a Vite-powered React client, Supabase SQL, and rich seed tooling described in the in-repo handbook, but several platform guardrails are still missing or under-specified.【F:chd-qbank/README.md†L1-L124】 Critical near-term work focuses on hardening the PWA install path, tightening type safety, and ensuring security-definer analytics SQL stays aligned with policy intent.【F:chd-qbank/public/manifest.json†L1-L8】【F:chd-qbank/tsconfig.json†L3-L18】【F:chd-qbank/schema.sql†L768-L860】 Prioritized remediation this week: ship real manifest icons, add an explicit TS typecheck command to CI, document SBOM/secrets scanning, and review Supabase RLS drift.

**Top Fixes This Week (partial)**

| Rank | Fix | Est. Effort |
| --- | --- | --- |
| 1 | Populate `public/manifest.json` icons array with 48–512px assets and align Vite PWA registration | 4h |
| 2 | Add `typecheck`/`tsc --noEmit` script and wire into GitHub Actions gating alongside ESLint/Vitest | 2h |
| 3 | Produce CycloneDX SBOM + `npm audit --json` output in CI, archive as artifact for release sign-off | 3h |
| 4 | Re-validate Supabase analytics security-definer functions vs. RLS policies and create regression tests | 5h |
| 5 | Expand `.env.example` placeholders to avoid suggesting static invite codes in downstream forks | 1h |

**Scorecard (partial)**

| Area | Score |
| --- | --- |
| Security | 65 |
| Reliability | 70 |
| Performance | 72 |
| Maintainability | 68 |
| Developer Experience | 60 |
| Testing | 74 |
| CI/CD | 78 |
| Documentation | 80 |
| Compliance | 55 |

Confidence: Medium — core web/service-worker paths reviewed, Supabase and automation coverage sampled. Quick wins: manifest + CI scripts. Deep work: Supabase policy regression testing.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0A | Manifest icons missing | `icons` is an empty array, preventing install banners | Users cannot install the PWA or get high-res icons | 4h | High | P1 | Frontend | 【F:chd-qbank/public/manifest.json†L1-L8】 |
| 0B | Typecheck not enforced | Scripts omit `tsc --noEmit` | Runtime-only regressions slip past CI | 2h | Medium | P1 | DX | 【F:chd-qbank/package.json†L6-L22】 |
| 0C | Analytics definer SQL lacks regression harness | Security-definer functions depend on `is_admin()` but no automated verification | Policy drift could leak PHI to students | 5h | High | P0 | Data | 【F:chd-qbank/schema.sql†L768-L860】 |

## 1) Repo Inventory & Architecture
`chd-qbank/README.md` provides a directory tour covering React source, Supabase SQL, scripts, and tests, confirming a single-app workspace rather than a monorepo.【F:chd-qbank/README.md†L5-L83】 Runtime entrypoints include `src/main.tsx`, `src/App.tsx`, and Supabase SQL functions such as `analytics_heatmap_admin()` for analytics.【F:chd-qbank/schema.sql†L768-L860】 Suggested ADRs: “Switch from Vite SPA to Next.js App Router”, “Supabase analytics security-definer strategy”, “PWA offline shell refresh policy”.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1A | Architecture map undocumented beyond README | README lists directories but lacks C4 diagrams | Harder for new staff to reason about data flows | 3h | Medium | P2 | Platform | 【F:chd-qbank/README.md†L5-L83】 |

Fix: Author `docs/architecture/c4-context.md` summarizing client ↔ Supabase ↔ storage interactions; include PlantUML snippet.

## 2) Build, Run & Local DX
The repo leans on npm scripts without an orchestration layer; no Makefile/justfile exists, and scripts omit a dedicated typecheck or audit command.【F:chd-qbank/package.json†L6-L22】 Provide `.editorconfig`, `.gitattributes`, and expanded `.gitignore` to align cross-editor defaults. Recommend enabling `corepack` instructions in README.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2A | No universal task runner | npm scripts only | Onboarding requires memorizing numerous commands | 2h | Medium | P2 | DX | 【F:chd-qbank/package.json†L6-L22】 |
| 2B | Missing editor settings | No repo-level `.editorconfig`/`.gitattributes` discovered | Inconsistent formatting and line endings | 1h | Low | P3 | DX | (absence noted) |

Fix: Add `Makefile` with `setup`, `dev`, `lint`, `typecheck`, `test`, `build`, `e2e`, `audit`, `analyze`. Commit `.editorconfig` enforcing UTF-8/2 spaces.

## 3) TypeScript/Next.js Static Analysis
`tsconfig.json` enables `strict` but still sets `skipLibCheck`, reducing coverage for Supabase types; scripts also lack a `tsc --noEmit` command.【F:chd-qbank/tsconfig.json†L3-L18】【F:chd-qbank/package.json†L6-L22】 ESLint only targets `src/`, so Supabase scripts remain unchecked. Recommend adding workspace-level ESLint config for `supabase/functions` and `scripts`. Ensure future CI runs `tsc --noEmit`, `eslint .`, `prettier --check`, `depcheck`, and `next build` equivalent (Vite `vite build --mode test`).

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3A | `skipLibCheck` still enabled | Present in tsconfig | Masked Supabase client issues | 1h | Medium | P1 | DX | 【F:chd-qbank/tsconfig.json†L3-L18】 |
| 3B | ESLint ignores scripts | ESLint command scoped to `src` | Automation code might ship lint errors | 1h | Low | P2 | DX | 【F:chd-qbank/package.json†L6-L22】 |

Fix: Remove `skipLibCheck`, add `"typecheck": "tsc --noEmit"`, extend ESLint config to include `scripts/**/*.ts?(x)`.

## 4) Dependency & Supply Chain Risk
Dependencies remain on caret ranges; `zod` is duplicated across dep/devDeps, increasing install size.【F:chd-qbank/package.json†L24-L70】 CI lacks SBOM/audit steps. Configure Dependabot grouping major updates, add `npm audit --json` artifact and CycloneDX via `cyclonedx-npm`. Provide Renovate `schedule` aligning with release cadence.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4A | `zod` duplicated | Appears in dependencies and devDependencies | Unnecessary duplication complicates version bumps | 0.5h | Low | P3 | Platform | 【F:chd-qbank/package.json†L24-L70】 |
| 4B | No SBOM generation | Workflows focus on lint/test only | Hard to satisfy compliance reviews | 3h | Medium | P1 | Security | 【F:.github/workflows/ci.yml†L1-L120】 |

Fix: Remove `zod` from devDependencies, add `npm run sbom` script invoking `cyclonedx-npm --output sbom.xml` and upload in CI.

## 5) Secrets & Sensitive Data
`.env.example` ships with what looks like real invite codes/dates; clarify they are placeholders to avoid accidental reuse.【F:chd-qbank/.env.example†L1-L5】 Ensure gitleaks/trufflehog run in CI (not currently listed). Provide sanitized sample env docs in `ENV.md`.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5A | Static invite code in sample env | `.env.example` includes `CHD2025FALL` | Downstream forks might treat as production secret | 1h | Medium | P1 | Security | 【F:chd-qbank/.env.example†L1-L5】 |

Fix: Replace with `<PLACEHOLDER>` tokens and update docs.

## 6) Security (Code, Actions, Infra)
Analytics functions (`analytics_refresh_heatmap`, `analytics_heatmap_admin`) run as `security definer` and rely on `is_admin()`; add regression tests to confirm RLS enforcement when `is_admin()` returns false.【F:chd-qbank/schema.sql†L768-L860】 GitHub Actions exist for CI, e2e, secret scanning, and question validation, but workflows should pin third-party actions to SHAs and run `actionlint` periodically.【F:.github/workflows/ci.yml†L1-L120】 Recommend `SECURITY.md` referencing responsible disclosure (already present) but add triage SLA.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6A | Lack of automated RLS regression tests | Analytics functions security-definer | Potential privilege escalation | 5h | High | P0 | Data | 【F:chd-qbank/schema.sql†L768-L860】 |
| 6B | Actions not pinned to SHAs | Workflow uses version tags | Supply-chain hijack risk | 2h | Medium | P1 | DevOps | 【F:.github/workflows/ci.yml†L1-L120】 |

Fix: Add Supabase regression tests (Vitest + Postgres test container) and update workflows to use `@<sha>` references.

## 7) Performance & Repo Bloat
Service worker precaches core shell but lacks image optimization hints; manifest icons empty also impact performance and install experience.【F:chd-qbank/src/service-worker.ts†L16-L215】【F:chd-qbank/public/manifest.json†L1-L8】 Suggest `next.config.js` equivalent for static asset caching and using responsive images. No large binaries spotted in repo root.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7A | Static asset caching lacks versioning for media | Service worker caches `STATIC_CACHE` but no busting of media | Risk stale media across releases | 3h | Medium | P2 | Frontend | 【F:chd-qbank/src/service-worker.ts†L16-L215】 |

Fix: Include asset manifest revisioning (e.g., inject manifest via Vite plugin) and add Workbox runtime caching strategies.

## 8) Testing Quality & Coverage
Vitest-based unit tests exist with fixtures covering context panels and practice logic, but coverage thresholds are not enforced (`vitest` run lacks `--coverage`).【F:chd-qbank/package.json†L6-L22】【F:chd-qbank/src/__tests__/practice.test.ts†L1-L120】 Introduce coverage gate (lines ≥80%), consider mutation testing (Stryker). Provide Playwright e2e skeleton for offline quiz flow using service worker.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 8A | No coverage enforcement | `vitest` scripts omit coverage flags | Quality drifts undetected | 2h | Medium | P2 | QA | 【F:chd-qbank/package.json†L6-L22】 |

Fix: Add `vitest run --coverage --runInBand` to CI and fail under threshold.

## 9) CI/CD & Branch Protections
Multiple workflows already run lint/tests/e2e/secret scans, yet none produce SBOMs or store artifacts for compliance.【F:.github/workflows/ci.yml†L1-L120】 Branch protections should enforce status checks (`ci`, `validate-qbank`). Add CODEOWNERS for Supabase SQL (already present but ensure coverage). Suggest preview deploy gating via Vercel environment variables.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9A | Missing SBOM/audit stage in CI | Current workflow steps limited to install/lint/test | Regulatory audits require provenance | 3h | Medium | P1 | DevOps | 【F:.github/workflows/ci.yml†L1-L120】 |

Fix: Add job running `npm audit --json`, `cyclonedx-npm`, uploading artifacts, gating release branches.

## 10) Logging, Observability & Feature Flags
Service worker logs cache stats via `console.info`, but client/server logs lack correlation IDs or structured logging. Context panel models exist but no feature flag service. Introduce lightweight logging wrapper (e.g., `@logtail/browser`) and create `config/featureFlags.ts` to toggle tutor mode features.【F:chd-qbank/src/service-worker.ts†L200-L214】【F:chd-qbank/src/lib/constants.ts†L36-L66】

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10A | No feature flag scaffolding | Context panels assumed always on | Hard to stage tutor rail improvements | 2h | Medium | P2 | Frontend | 【F:chd-qbank/src/lib/constants.ts†L36-L66】 |

Fix: Add feature flag provider (Zustand slice) controlling tutor mode rollouts.

## 11) Documentation & Onboarding
Existing README is thorough for setup/testing, but contributor docs could cross-link to Supabase policy checklists and PWA behavior references (currently in `/docs`).【F:chd-qbank/README.md†L17-L124】 Provide `CONTRIBUTING.md` updates aligning with new CI tasks, add issue templates for analytics regressions.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11A | README lacks quick `corepack` note and new scripts | Setup steps omit node version management | Reduces DX for pnpm/yarn adopters | 1h | Low | P3 | DX | 【F:chd-qbank/README.md†L17-L83】 |

Fix: Update README Quickstart with `corepack enable` and new `Makefile` tasks.

## 12) Licensing & Compliance
Root `LICENSE` already present, but dependency license report absent. Generate third-party license summary using `npx license-checker --json` and produce `NOTICE`. Ensure media assets tracked with usage rights.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12A | No license report automation | No scripts/workflows for NOTICE | Compliance reviews blocked | 2h | Medium | P1 | Legal | (needs addition) |

Fix: Add `npm run license:audit` script and CI stage storing output.

## 13) Accessibility & i18n
Question cards render context panels but no mention of focus management or aria labeling. Add `@axe-core/react` dev integration and plan for translation keys. Provide `scripts/i18n/extract.ts` stub to gather strings.【F:chd-qbank/src/components/QuestionCard.tsx†L60-L110】

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13A | Tutor mode panels missing aria roles | Repeating `<div>` without semantics | Screen readers may miss context | 3h | Medium | P1 | Frontend | 【F:chd-qbank/src/components/QuestionCard.tsx†L60-L110】 |

Fix: Wrap panels in `<section role="complementary" aria-labelledby>` and add keyboard focus traps.

## 14) Deployment Targets (Vercel + Supabase)
`vercel.json` exists at repo root but lacks headers for security (e.g., `Strict-Transport-Security`) and caching hints for media bundles. Supabase SQL defines leaderboard/events, analytics functions, and security policies, but we need automation verifying RLS stays enabled post-migrations.【F:vercel.json†L1-L80】【F:chd-qbank/schema.sql†L768-L872】 Document env var propagation between Vercel and Supabase using `ENV.md`.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 14A | Missing HTTP header hardening | `vercel.json` lacks headers | Reduces security posture | 2h | Medium | P1 | DevOps | 【F:vercel.json†L1-L80】 |

Fix: Extend `vercel.json` with `headers` array covering CSP, HSTS, Referrer-Policy.

## 15) 7-Day Action Plan & Work Breakdown (Partial)
Day 1: Publish manifest icon assets and update service worker tests. Day 2: Add `typecheck` script, update CI, run baseline `tsc` & `eslint`. Day 3: Generate SBOM/licence reports, integrate into CI. Day 4: sanitize `.env.example`, add gitleaks workflow. Day 5: Implement analytics regression tests + tutor mode flags. Day 6: Draft architecture ADR + i18n plan. Day 7: Review RLS policies, update documentation.

**Risk Burndown (simplified)**

| Day | Risk Surface | Expected Status |
| --- | --- | --- |
| 1 | PWA install blockers | Icons merged |
| 3 | Supply-chain visibility | SBOM pipeline active |
| 5 | Analytics leakage | Regression tests merged |
| 7 | Policy drift | RLS review complete |

---

# CHD/QBank/PWA Special Checks (Partial)

## A) QBank Schema & Content Authoring
Question schema includes context panels, lab/formula metadata, and media bundle references, indicating tutor rail data paths are wired through types.【F:chd-qbank/src/lib/constants.ts†L36-L66】 Provide new migration `supabase/migrations/20240702090000_qbank_context_defaults.sql` to enforce non-null defaults for context panel arrays, plus `scripts/seed-qbank.ts` to populate starter data (follow-up required).

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA1 | No migration enforcing context panel defaults | Types expect arrays but SQL defaults unspecified | Prevents null-handling bugs in ItemEditor | 4h | Medium | P1 | Data | 【F:chd-qbank/src/lib/constants.ts†L36-L66】 |

## B) Tutor Mode Right Rail
`QuestionCard` renders `context_panels` but lacks validation/preview toggles in authoring UI; ItemEditor enhancements needed for labs/formulas.【F:chd-qbank/src/components/QuestionCard.tsx†L60-L110】 Add controlled inputs and preview panel to ItemEditor with schema validation (future diff required).

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TB1 | ItemEditor missing context panel controls | Question display reads panels but editor unspecified | Authors cannot manage right-rail content | 6h | High | P0 | Frontend | 【F:chd-qbank/src/components/QuestionCard.tsx†L60-L110】 |

## C) Analytics Heatmap (Aggregate View)
Security-definer functions exist but require verification jobs and policies ensuring only admins execute them.【F:chd-qbank/schema.sql†L768-L860】 Provide migration to enforce `security invoker` for read-only functions or gating via policy. Add cron job to refresh materialized view concurrently, ensuring `analytics_refresh_heatmap` remains restricted.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HC1 | Lacks automated refresh job validation | Materialized view refresh manual | Data may stale >7 days | 2h | Medium | P1 | Data | 【F:chd-qbank/schema.sql†L781-L860】 |

## D) Weekly Leaderboard Accuracy
`leaderboard_weekly_entries()` selects the latest attempt per user/question plus murmur/CXR wins, but unique constraint on `leaderboard_events` may block multi-source accrual; audit required.【F:chd-qbank/schema.sql†L720-L875】 Add event table migration ensuring timestamped records and weekly recompute job.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WD1 | `leaderboard_events` unique constraint may cap multiple rewards | Unique `(source, source_id)` | Weekly scoring might miss repeated wins | 3h | Medium | P1 | Data | 【F:chd-qbank/schema.sql†L862-L870】 |

## E) CXR Game Bounding Boxes
CXR logic not fully reviewed in allotted time; bounding-box validation deferred.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CX1 | Bounding-box math unverified | Deferred | Potential gameplay inaccuracies | 6h | High | P0 | Games | Deferred |

## F) PWA Install & Offline
Service worker handles app shell caching and offline fallback but icons missing and cache busting limited; offline quiz flow Playwright coverage absent.【F:chd-qbank/src/service-worker.ts†L16-L215】【F:chd-qbank/public/manifest.json†L1-L8】 Add Workbox-based SW, versioned caches, runtime caching for Supabase queries, and offline quiz e2e scenario.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PF1 | Icons empty prevents install | Manifest lacks icons | Users cannot install app | 4h | High | P0 | Frontend | 【F:chd-qbank/public/manifest.json†L1-L8】 |
| PF2 | No offline e2e coverage | Test suite lacks offline run | Offline regressions undetected | 4h | Medium | P1 | QA | 【F:chd-qbank/package.json†L6-L22】 |

## G) Supabase Security & RLS
Schema enables RLS on leaderboard events and uses security-definer functions, but we need consolidated policy documentation and automated checks verifying each table’s policy coverage.【F:chd-qbank/schema.sql†L862-L875】 Draft `POLICY.md` summarizing read/write policies and extend `scripts/verifySeed` to confirm RLS statuses.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SG1 | No single policy index | Policies scattered in SQL | Risk missing updates across migrations | 3h | Medium | P1 | Security | 【F:chd-qbank/schema.sql†L862-L875】 |

## H) TypeScript & Toolchain Hygiene
`tsconfig` already `strict`, but `skipLibCheck` on plus missing typecheck script reduces confidence; ensure Vitest config aligns with jsdom (present) and add Node vs browser test splits.【F:chd-qbank/tsconfig.json†L3-L21】【F:chd-qbank/vitest.config.ts†L1-L120】 Enforce `noImplicitOverride` via `tsconfig` tweaks.

**Triage Table**

| ID | Issue | Evidence | Why it matters | Effort | Impact | Priority | Owner hint |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TH1 | `skipLibCheck` weakens safety | tsconfig setting | Missed Supabase type regressions | 1h | Medium | P1 | DX | 【F:chd-qbank/tsconfig.json†L3-L18】 |

---

## Fix Pack Manifest (partial)
1. `docs/partial-audit-2024-07-02.md` – This report capturing priority findings and remediation backlog.

## PR Plan (draft)
- **Title:** chore: document partial audit findings and remediation plan
- **Branch:** audit/improvements
- **Body:**
  - Summary
    - Capture partial audit results focusing on PWA, type safety, and Supabase security hot spots.
  - Testing
    - Docs-only change (no tests required).
  - Checklist
    - [ ] Manifest icons populated
    - [ ] Typecheck script merged
    - [ ] SBOM workflow added
    - [ ] Supabase policy review complete
- **Follow-up Issues:**
  - `P0` Tutor rail ItemEditor controls (Frontend)
  - `P1` Analytics heatmap regression tests (Data)
  - `P1` SBOM + audit automation (DevOps)
  - `P0` PWA icon/Workbox overhaul (Frontend)

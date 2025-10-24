# Documentation simplification opportunities

This inventory summarizes the most repetitive or outdated guidance across the CHD repository so future cleanup work can focus on the highest-impact edits.

## Top-level guides

| Document | Observation | Recommendation |
| --- | --- | --- |
| [`README.md`](../README.md) | Covers setup, environment variables, deployment, and security in one long page. Much of that material is repeated verbatim in the specialized runbooks and environment guides. | Trim the README to onboarding essentials (project overview, quick start, how to find deeper docs) and link to the focused runbooks instead of re-explaining the same commands and policies in multiple places. |
| [`RUNBOOK.md`](../RUNBOOK.md) & [`RELEASE.md`](../RELEASE.md) | Both files describe staging → production promotion, maintenance toggles, and rollback plans with overlapping bullet lists. | Merge them into a single "Release & operations" guide so the go/no-go checklist, seed commands, and rollback steps live together. |
| [`ENV.md`](../ENV.md) vs. README | Environment variables are documented twice with slightly different descriptions and casing guidance. | Keep the canonical table in `ENV.md` and replace the README section with a short pointer so the two files never drift. |
| [`SECURITY.md`](../SECURITY.md) | Uses a placeholder `security@example.com` contact and lacks references to Supabase breach procedures already described in other docs. | Replace the placeholder address with a real inbox (or direct readers to an issue template) and link to the Supabase credential rotation steps once they exist. |

## `docs/` directory

| Document | Observation | Recommendation |
| --- | --- | --- |
| [`docs/partial-audit-2024-07-02.md`](./partial-audit-2024-07-02.md) | Large audit backlog from mid-2024 that mixes proposed fixes, future ADRs, and work-plan notes. It is unclear whether the tasks are still relevant. | Either archive this audit under a dated subfolder with a status note or convert open items into GitHub issues so the repository docs only describe current expectations. |
| [`docs/ops/event-retention.md`](./ops/event-retention.md) | Clear, but it repeats schema pointers already covered in the README and Supabase migration comments. | Keep the SQL examples, but link to the README's automation section instead of re-stating the file locations. |
| [`docs/analytics/heatmap.md`](./analytics/heatmap.md) & [`docs/security/admin-roles.md`](./security/admin-roles.md) | Both are in good shape but could share a common "verification" section rather than repeating command snippets in isolation. | Create a shared "Supabase verification" appendix that explains how to run RPCs and seed scripts, then reference it from each specialized runbook. |
| [`docs/runtime/service-worker.md`](./runtime/service-worker.md) | Content is accurate but predates the PWA icon/gap fixes noted in the partial audit, leading to conflicting advice. | Update once the Workbox/offline backlog items ship so the instructions match the current caching strategy. |

## Missing glue

- Add a short "Documentation index" (README section or `docs/README.md`) that explains which runbook to read for specific tasks (deployment, analytics verification, security triage, etc.).
- Move time-sensitive checklists (audit notes, go/no-go rehearsals) into dated subfolders or issues to keep the default docs lean.
- Where multiple files mention the same Supabase scripts, replace inline shell blocks with links to the automation reference so changes happen in one place.

These edits should make it easier for new contributors to find authoritative guidance without wading through duplicated instructions.

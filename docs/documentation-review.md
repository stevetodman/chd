# Documentation simplification opportunities

This inventory summarizes the most repetitive or outdated guidance across the CHD repository so future cleanup work can focus on the highest-impact edits.

## Top-level guides

| Document | Observation | Recommendation |
| --- | --- | --- |
| [`README.md`](../README.md) | Trimmed in September 2024 to highlight onboarding essentials and link to the new documentation index. | ✅ Complete. |
| [`RUNBOOK.md`](../RUNBOOK.md) & [`RELEASE.md`](../RELEASE.md) | Each file now points to the consolidated [`docs/ops/release-runbook.md`](./ops/release-runbook.md). | ✅ Complete. |
| [`ENV.md`](../ENV.md) vs. README | Both files now defer to [`docs/runtime/environment-configuration.md`](./runtime/environment-configuration.md). | ✅ Complete. |
| [`SECURITY.md`](../SECURITY.md) | Uses a placeholder `security@example.com` contact and lacks references to Supabase breach procedures already described in other docs. | ✅ Updated with the security inbox, advisory form, and Supabase credential rotation runbook. |

## `docs/` directory

| Document | Observation | Recommendation |
| --- | --- | --- |
| [`docs/archive/partial-audit-2024-07-02.md`](./archive/partial-audit-2024-07-02.md) | Archived snapshot retained for historical context; move any active work into GitHub issues. | ✅ Archived under `docs/archive/`. |
| [`docs/ops/event-retention.md`](./ops/event-retention.md) | Clear, but it repeats schema pointers already covered in the README and Supabase migration comments. | ✅ Now links to the documentation index and Supabase verification appendix instead of duplicating schema references. |
| [`docs/analytics/heatmap.md`](./analytics/heatmap.md) & [`docs/security/admin-roles.md`](./security/admin-roles.md) | Both are in good shape but could share a common "verification" section rather than repeating command snippets in isolation. | ✅ Shared Supabase verification appendix created and referenced. |
| [`docs/runtime/service-worker.md`](./runtime/service-worker.md) | Content is accurate but predates the PWA icon/gap fixes noted in the partial audit, leading to conflicting advice. | ✅ Updated to reflect the Workbox caching strategies, offline page, and update messaging. |

## Missing glue

- Add a short "Documentation index" (README section or `docs/README.md`) that explains which runbook to read for specific tasks (deployment, analytics verification, security triage, etc.). ✅ Added as `docs/README.md`.
- Move time-sensitive checklists (audit notes, go/no-go rehearsals) into dated subfolders or issues to keep the default docs lean.
- Where multiple files mention the same Supabase scripts, replace inline shell blocks with links to the automation reference so changes happen in one place. ✅ Addressed via the shared Supabase verification appendix and documentation index updates.

These edits should make it easier for new contributors to find authoritative guidance without wading through duplicated instructions.

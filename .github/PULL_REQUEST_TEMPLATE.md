## Summary
- Describe the purpose of this change and link to related issues or discussions.
- Highlight any notable implementation details reviewers should know upfront.

## Documentation & citations
- [ ] All clinical assertions and statistics include inline citations following the [content style checklist](../docs/documentation-content-style-checklist.md).
- [ ] References section or bibliography updated when more than three sources are cited.
- [ ] Not applicable (no clinical content changes)

## Operational readiness
- [ ] RLS, grants, and Supabase migrations were reviewed for security regressions; destructive changes avoided or justified.
- [ ] Seeds, invite codes, and automation scripts updated (or confirmed not required).
- [ ] Service worker version bumped when changing cached assets.
- [ ] Edge function rate limits and error handling verified (or not affected).
- [ ] Analytics verification scripts run (`npm --prefix chd-qbank run verify:seed` / `verify:analytics:heatmap`) for data-model changes.
- [ ] Not applicable (docs-only or non-operational change)

## Testing
- [ ] Lint command(s) and output:
- [ ] Test command(s) and output:
- [ ] Not applicable (docs-only change)

> **Note:** If you skip linting or tests, explain why. Documentation-only changes should explicitly check the "Not applicable" box.

## UI changes
- [ ] Screenshots or recordings attached when modifying user-facing visuals.
- [ ] Not applicable (no UI changes)

Please annotate any unchecked box with context before requesting review.

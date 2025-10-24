## PR Checklist
- [ ] RLS changes reviewed; (select app.is_admin()) wrapper used; indexes added.
- [ ] Migrations are reversible and avoid table-locking changes during peak hours.
- [ ] Service worker version bumped; manual test of update prompt done.
- [ ] Edge function rate limit verified; 400/429/503 cases covered by tests.
- [ ] Analytics verify script run in staging and results posted.
- [ ] Clinical content updates include inline citations per the [Content Style Checklist](../docs/documentation-content-style-checklist.md).

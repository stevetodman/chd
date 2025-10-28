# Heatmap analytics runbook

The `analytics_heatmap_agg` materialized view powers the admin heatmap that summarizes learner performance without exposing per-user attempts. This guide documents the database objects involved, refresh and validation workflows, and safeguards bundled with the automation scripts.

## Objects

| Object | Purpose |
| --- | --- |
| `analytics_heatmap_agg` | Materialized view grouped by `(question_id, lesion, topic, week_start)` with aggregate counts and timing statistics. |
| `analytics_heatmap_admin()` | SECURITY DEFINER function that returns the aggregated rows to authorized callers. |
| `analytics_refresh_heatmap()` | SECURITY DEFINER helper that issues `REFRESH MATERIALIZED VIEW CONCURRENTLY` on the heatmap view. |
| `analytics_heatmap_agg_idx` | Composite index on `(week_start, question_id)` that keeps refreshes and lookups fast. |

The definitions live in [`chd-qbank/schema.sql`](../../chd-qbank/schema.sql). Non-admin roles never access the materialized view directly; they must call the `analytics_heatmap_admin()` function which enforces service-role or admin access.

### Columns

| Column | Description |
| --- | --- |
| `question_id` | UUID referencing `questions.id`. |
| `lesion` | Normalized lesion tag surfaced in the heatmap filters. |
| `topic` | High-level topic label. |
| `week_start` | ISO week (Monday) derived from response timestamps. |
| `attempts` | Total number of responses captured for the question during the week. |
| `correct_attempts` | Count of responses marked correct. |
| `accuracy_rate` | Ratio of `correct_attempts / attempts` expressed as a numeric value with two decimals. |
| `median_duration_ms` | Median time in milliseconds learners spent answering the item. |

## Refreshing

Refreshes should run through the `analytics_refresh_heatmap()` function so permissions remain consistent:

```sql
select analytics_refresh_heatmap();
```

When scheduling the refresh via `pg_cron` or Supabase's scheduled functions, use a service-role key and call the same function.

## Verification script

`scripts/verify-analytics-heatmap.mjs` seeds synthetic responses, refreshes the materialized view, and reports timing statistics. Use it after schema or policy changes to verify that refreshes remain performant. Connection options, environment variables, and production safeguards are documented in the [Supabase verification appendix](../ops/supabase-verification.md).

### Safe staging workflow

Two safeguards prevent accidental production impact:

- `--dry-run` performs authentication, schema checks, and permission probes without inserting data.
- `--allow-prod` must be provided explicitly (with confirmation) before the script will operate on a production hostname.

Recommended checklist:

1. Point `.env` at the staging project and run `npm run verify:analytics:heatmap -- --dry-run`.
2. Review the output for “ready to write synthetic data.”
3. Re-run without `--dry-run` to seed, refresh, and clean up (the script removes test data automatically).
4. Only pass `--allow-prod` for break-glass production debugging, and document the justification in the deployment log.

# Heatmap Analytics Aggregation

The `analytics_heatmap_agg` materialized view stores row-level aggregates that power the admin heatmap. The view groups by question and week to avoid exposing per-user attempts. This document captures operational notes for refreshing the view, interpreting the columns, and validating data end to end.

## Objects

- `analytics_heatmap_agg` – materialized view with counts, correctness, and timing metrics grouped by `(question_id, lesion, topic, week_start)`.
- `analytics_heatmap_admin()` – SECURITY DEFINER function that enforces admin/service-role access and returns the aggregate rows ordered by week.
- `analytics_refresh_heatmap()` – SECURITY DEFINER function that runs `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- `analytics_heatmap_agg_idx` – composite index on `(week_start, question_id)` to keep refreshes and lookups fast.

Non-admin roles do **not** have direct `SELECT` access to the materialized view; they must go through the checked functions.

### Columns

| Column | Description |
| --- | --- |
| `question_id` | UUID for the question in `questions`.
| `lesion` | Normalized lesion tag for filtering domain-specific clusters.
| `topic` | High-level topic tag surfaced in the admin UI.
| `week_start` | ISO week (Monday) bucket derived from response timestamps.
| `attempts` | Total number of responses captured for the question during the week.
| `correct_attempts` | Count of responses marked correct.
| `accuracy_rate` | `correct_attempts / attempts` cast to numeric with two decimal places.
| `median_duration_ms` | Median time (in milliseconds) learners spent answering.

## Refreshing

Run the security-definer function:

```sql
select analytics_refresh_heatmap();
```

For Supabase cron jobs, call the same function with the service-role key.

## Verification script

`scripts/verify-analytics-heatmap.mjs` seeds ~10k synthetic response rows using the service role, refreshes the view, and reports the refresh duration. Use this script before and after schema changes to confirm indexes and policies remain performant. Configure these environment variables (local `.env` works):

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
HEATMAP_VERIFY_USERS=50        # optional override
HEATMAP_VERIFY_QUESTIONS=200   # optional override
HEATMAP_VERIFY_BATCH=500       # optional override
```

Run the script:

```bash
npm run verify:analytics:heatmap
```

The script cleans up all inserted rows and users, then triggers a final refresh so the materialized view returns to a clean state. Capture the reported runtime in your pull request when modifying analytics logic so reviewers can track performance trends.

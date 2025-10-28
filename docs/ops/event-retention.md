# Event retention jobs

Telemetry tables (`answer_events`, `leaderboard_events`) can grow quickly. The retention job keeps them trimmed to a rolling window while preserving recent activity for analytics and audit purposes. See the automation overview in the [documentation index](../README.md) for schema and script locations.

## Configuration

Retention is controlled by the singleton row in `app.app_settings`:

```sql
select retain_event_days from app.app_settings;
```

Update the value with:

```sql
update app.app_settings
   set retain_event_days = 120,
       updated_at = timezone('utc', now())
 where id = true;
```

`retain_event_days` must be at least `1`. If the field is unset, the pruning function defaults to 180 days.

## Manual execution

Trigger pruning on demand (connection options are summarized in the [Supabase verification appendix](./supabase-verification.md)):

```sql
select * from app.prune_old_events();
```

The function deletes rows in batches (default 1,000). Pass a smaller batch size if needed:

```sql
select * from app.prune_old_events(250);
```

Each invocation reports the number of rows removed per table, allowing the job to resume safely if interrupted.

## Scheduled execution

When `pg_cron` is available (default for hosted Supabase Postgres) the migration schedules a daily run at 04:15 UTC:

```sql
select *
  from cron.job
 where jobname = 'app_prune_old_events';
```

The scheduled job executes the same function and therefore respects updated retention values immediately.

### Supabase scheduled function fallback

If `pg_cron` is unavailable, create a Supabase Edge Function that calls `app.prune_old_events` and schedule it through the Supabase dashboard. Follow the deployment pattern in the automation overview and adapt this minimal example:

```ts
// supabase/functions/prune-events/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async () => {
  const { error } = await supabase.rpc("app.prune_old_events");
  if (error) {
    console.error("prune_old_events failed", error);
    return new Response(error.message, { status: 500 });
  }

  return new Response("ok");
});
```

Deploy the function and assign a daily Scheduled Trigger to mirror the cron-based workflow.

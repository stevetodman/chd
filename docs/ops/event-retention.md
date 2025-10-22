# Event Retention Jobs

The question bank accumulates high-volume audit data in `public.answer_events` and
`public.leaderboard_events`. A nightly retention job keeps these tables lean while
preserving a configurable history window.

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

The `retain_event_days` value must be at least `1`. The pruning function falls back to
180 days if the table has not been initialized yet.

## Manual execution

Invoke pruning on demand from psql or the Supabase SQL editor:

```sql
select * from app.prune_old_events();
```

The function operates in small batches (default 1,000 rows per loop) so that it can be
re-run safely without long locks. Pass a smaller batch size if needed:

```sql
select * from app.prune_old_events(250);
```

Each invocation returns the number of rows deleted per table, allowing the job to resume
where it left off if terminated mid-run.

## Scheduled execution

When `pg_cron` is available (the default in the Supabase-hosted Postgres instance), the
migration schedules a daily run at 04:15 UTC:

```sql
select *
  from cron.job
 where jobname = 'app_prune_old_events';
```

Use the query above to confirm the job is registered. The job executes the same function
shown in the manual example and therefore honors updated retention values immediately.

### Supabase Scheduled Function fallback

If `pg_cron` is not installed in the environment, create a Supabase Edge Function that
invokes the RPC and run it with the Supabase scheduler. A minimal function might look
like this:

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

Deploy the function and wire it to a daily Scheduled Trigger inside the Supabase dashboard.
This matches the cron-based workflow and keeps retention automated even without `pg_cron`.

-- Ensure idempotency key cleanup runs frequently enough to enforce the 10 minute TTL.
-- Schedules a pg_cron job to purge stale keys and removes older schedules.

do $$
declare
  job_to_clear integer;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for job_to_clear in
      select jobid from cron.job where jobname in (
        'cleanup_idempotency_keys_nightly',
        'cleanup_idempotency_keys_ten_minute'
      )
    loop
      perform cron.unschedule(job_to_clear);
    end loop;

    perform cron.schedule(
      'cleanup_idempotency_keys_ten_minute',
      '*/5 * * * *',
      $$delete from idempotency_keys where created_at < now() - interval '10 minutes';$$
    );
  end if;
end;
$$;

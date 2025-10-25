begin;

alter table if exists public.leaderboard_events
  drop constraint if exists leaderboard_events_source_source_id_key;

alter table if exists public.leaderboard_events
  add constraint leaderboard_events_unique_user_source
    unique (user_id, source, source_id);

commit;

-- Replace the weekly leaderboard view with a cache that can be refreshed concurrently.
drop view if exists public.leaderboard_weekly;

create materialized view if not exists public.leaderboard_weekly_cache
as
select * from public.leaderboard_weekly_entries();

create unique index if not exists leaderboard_weekly_cache_user_id_idx
  on public.leaderboard_weekly_cache(user_id);

create or replace view public.leaderboard_weekly as
select * from public.leaderboard_weekly_cache;

create or replace function public.leaderboard_refresh_weekly()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  refresh materialized view concurrently public.leaderboard_weekly_cache;
end;
$$;

grant execute on function public.leaderboard_refresh_weekly() to authenticated;
grant execute on function public.leaderboard_refresh_weekly() to service_role;

-- Ensure pg_cron keeps the cache and analytics heatmap current.
select cron.unschedule('refresh_leaderboard_weekly_hourly') where exists (
  select 1 from cron.job where jobname = 'refresh_leaderboard_weekly_hourly'
);

select cron.schedule(
  'refresh_leaderboard_weekly_hourly',
  '5 * * * *',
  $$select public.leaderboard_refresh_weekly();$$
);

select cron.unschedule('refresh_analytics_heatmap_hourly') where exists (
  select 1 from cron.job where jobname = 'refresh_analytics_heatmap_hourly'
);

select cron.schedule(
  'refresh_analytics_heatmap_hourly',
  '10 * * * *',
  $$select public.analytics_refresh_heatmap();$$
);

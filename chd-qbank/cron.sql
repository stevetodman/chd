-- Compute per-question difficulty (p), discrimination (point-biserial), avg time, distractor pick rates

create or replace view user_overall as
select user_id, avg(is_correct::int) as overall
from responses
group by user_id;

create or replace view item_user as
select r.question_id, r.user_id, r.is_correct::int as item_score, r.ms_to_answer, uo.overall
from responses r
join user_overall uo using(user_id);

create or replace function refresh_item_stats() returns void
language plpgsql as $$
begin
  insert into item_stats(question_id, n_attempts, p_value, discrimination_pb, avg_time_ms, last_computed_at)
  select
    question_id,
    count(*) as n_attempts,
    avg(item_score)::float as p_value,
    corr(item_score::float, overall) as discrimination_pb,
    avg(ms_to_answer)::float as avg_time_ms,
    now()
  from item_user
  group by question_id
  on conflict (question_id) do update
    set n_attempts=excluded.n_attempts,
        p_value=excluded.p_value,
        discrimination_pb=excluded.discrimination_pb,
        avg_time_ms=excluded.avg_time_ms,
        last_computed_at=excluded.last_computed_at;

  insert into distractor_stats(question_id, choice_id, picked_count, pick_rate)
  select c.question_id, c.id,
         sum( case when r.choice_id = c.id then 1 else 0 end ) as picked_count,
         sum( case when r.choice_id = c.id then 1 else 0 end )::float / greatest(count(r.id),1) as pick_rate
  from choices c
  left join responses r on r.question_id = c.question_id
  group by c.question_id, c.id
  on conflict (question_id, choice_id) do update
    set picked_count=excluded.picked_count,
        pick_rate=excluded.pick_rate;
end;
$$;

select cron.schedule('refresh_stats_nightly', '30 2 * * *', $$select refresh_item_stats();$$);
select cron.schedule('refresh_reliability_nightly', '45 2 * * *', $$select refresh_assessment_reliability();$$);
select cron.schedule('cleanup_idempotency_keys_ten_minute', '*/5 * * * *', $$
  delete from idempotency_keys
  where created_at < now() - interval '10 minutes';
$$);

select cron.schedule('refresh_leaderboard_weekly_hourly', '5 * * * *', $$select leaderboard_refresh_weekly();$$);
select cron.schedule('refresh_analytics_heatmap_hourly', '10 * * * *', $$select analytics_refresh_heatmap();$$);

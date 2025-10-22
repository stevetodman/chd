begin;

create materialized view if not exists analytics_heatmap_agg
as
select
  q.id as question_id,
  q.lesion,
  q.topic,
  date_trunc('week', timezone('utc', r.created_at))::date as week_start,
  count(*) as attempts,
  count(*) filter (where r.is_correct) as correct_attempts,
  avg(r.ms_to_answer)::double precision as avg_time_ms
from questions q
join responses r on r.question_id = q.id
where q.status = 'published'
group by q.id, q.lesion, q.topic, date_trunc('week', timezone('utc', r.created_at))::date
with no data;

create unique index if not exists analytics_heatmap_agg_question_week_idx
  on analytics_heatmap_agg(question_id, week_start);

refresh materialized view analytics_heatmap_agg;

revoke all on analytics_heatmap_agg from public;

grant select on analytics_heatmap_agg to postgres;

grant select on analytics_heatmap_agg to service_role;

create or replace function analytics_refresh_heatmap()
returns void
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if not app.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Admin privileges required';
  end if;

  refresh materialized view concurrently analytics_heatmap_agg;
end;
$$;

grant execute on function analytics_refresh_heatmap() to authenticated;

grant execute on function analytics_refresh_heatmap() to service_role;

create or replace function analytics_heatmap_admin()
returns table (
  question_id uuid,
  lesion text,
  topic text,
  week_start date,
  attempts bigint,
  correct_attempts bigint,
  incorrect_attempts bigint,
  correct_rate double precision,
  avg_time_ms double precision
)
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if not app.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Admin privileges required';
  end if;

  return query
    select
      question_id,
      lesion,
      topic,
      week_start,
      attempts,
      correct_attempts,
      attempts - correct_attempts as incorrect_attempts,
      case when attempts > 0 then correct_attempts::double precision / attempts else 0 end as correct_rate,
      avg_time_ms
    from analytics_heatmap_agg
    order by week_start desc, lesion, topic, question_id;
end;
$$;

grant execute on function analytics_heatmap_admin() to authenticated;

grant execute on function analytics_heatmap_admin() to service_role;

commit;

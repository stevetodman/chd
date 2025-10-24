begin;

create or replace function analytics_export_cohort()
returns table (
  cohort_id text,
  total_attempts bigint,
  correct_attempts bigint,
  incorrect_attempts bigint,
  correct_rate double precision,
  avg_time_ms double precision,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() and auth.role() <> 'service_role' then
    raise exception 'Admin privileges required';
  end if;

  return query
    select
      left(encode(digest(r.user_id::text, 'sha256'), 'hex'), 16) as cohort_id,
      count(*) as total_attempts,
      count(*) filter (where r.is_correct) as correct_attempts,
      count(*) filter (where not r.is_correct) as incorrect_attempts,
      case when count(*) > 0 then count(*) filter (where r.is_correct)::double precision / count(*) else 0 end as correct_rate,
      avg(r.ms_to_answer)::double precision as avg_time_ms,
      min(r.created_at) as first_attempt_at,
      max(r.created_at) as last_attempt_at
    from responses r
    group by 1
    order by total_attempts desc;
end;
$$;

grant execute on function analytics_export_cohort() to authenticated;

grant execute on function analytics_export_cohort() to service_role;

commit;

begin;

create schema if not exists app;

create or replace function app.is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select is_admin();
$$;

create or replace function analytics_refresh_heatmap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_duration_ms integer;
begin
  if auth.role() <> 'service_role' and not app.is_admin() then
    perform set_config('response.status', '403', true);
    return jsonb_build_object(
      'status', 403,
      'error', 'Admin privileges required'
    );
  end if;

  perform set_config('lock_timeout', '5s', true);

  begin
    refresh materialized view concurrently analytics_heatmap_agg;
    v_duration_ms := floor(extract(epoch from clock_timestamp() - v_started_at) * 1000);
    raise log 'analytics_refresh_heatmap refreshed analytics_heatmap_agg in % ms', v_duration_ms;
    return jsonb_build_object(
      'status', 200,
      'duration_ms', v_duration_ms
    );
  exception
    when lock_not_available then
      v_duration_ms := floor(extract(epoch from clock_timestamp() - v_started_at) * 1000);
      perform set_config('response.status', '409', true);
      raise log 'analytics_refresh_heatmap skipped refresh; lock timeout after % ms', v_duration_ms;
      return jsonb_build_object(
        'status', 409,
        'error', 'Refresh in progress',
        'duration_ms', v_duration_ms
      );
  end;
end;
$$;

grant execute on function analytics_refresh_heatmap() to authenticated;
grant execute on function analytics_refresh_heatmap() to service_role;

create or replace function analytics_heatmap_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_duration_ms integer;
  v_rows jsonb;
  v_is_admin boolean := app.is_admin();
begin
  if auth.role() <> 'service_role' and not coalesce(v_is_admin, false) then
    perform set_config('response.status', '403', true);
    return jsonb_build_object(
      'status', 403,
      'error', 'Admin privileges required'
    );
  end if;

  v_rows := (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    from (
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
      order by week_start desc, lesion, topic, question_id
    ) t
  );

  v_duration_ms := floor(extract(epoch from clock_timestamp() - v_started_at) * 1000);
  raise log 'analytics_heatmap_admin served % rows in % ms', coalesce(jsonb_array_length(v_rows), 0), v_duration_ms;

  return jsonb_build_object(
    'status', 200,
    'rows', v_rows,
    'duration_ms', v_duration_ms
  );
end;
$$;

grant execute on function analytics_heatmap_admin() to authenticated;
grant execute on function analytics_heatmap_admin() to service_role;

commit;

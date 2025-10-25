create or replace function increment_points(source text, source_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_is_valid boolean := false;
begin
  if v_user is null then
    raise exception 'auth required';
  end if;

  if source is null or source_id is null then
    raise exception 'invalid point source';
  end if;

  if source = 'practice_response' then
    select exists(
      select 1 from responses r where r.id = source_id and r.user_id = v_user and r.is_correct
    ) into v_is_valid;
  elsif source = 'murmur_attempt' then
    select exists(
      select 1 from murmur_attempts ma where ma.id = source_id and ma.user_id = v_user and ma.is_correct
    ) into v_is_valid;
  elsif source = 'cxr_attempt' then
    select exists(
      select 1 from cxr_attempts ca where ca.id = source_id and ca.user_id = v_user and ca.is_correct
    ) into v_is_valid;
  else
    raise exception 'unsupported point source %', source;
  end if;

  if not v_is_valid then
    raise exception 'invalid point source';
  end if;

  insert into leaderboard_events(user_id, source, source_id)
  values (v_user, source, source_id)
  on conflict (user_id, source, source_id) do nothing;

  if not found then
    return;
  end if;

  insert into leaderboard(user_id, points)
  values (v_user, 1)
  on conflict (user_id) do update set points = leaderboard.points + 1;
end;
$$;

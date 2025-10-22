create schema if not exists app;

grant usage on schema app to postgres;
grant usage on schema app to service_role;

create table if not exists app.app_settings (
  id boolean primary key default true,
  retain_event_days int not null default 180,
  updated_at timestamptz not null default now(),
  constraint retain_event_days_positive check (retain_event_days >= 1)
);

insert into app.app_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function app.touch_app_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_app_settings on app.app_settings;

create trigger trg_touch_app_settings
before update on app.app_settings
for each row
execute function app.touch_app_settings();

create or replace function app.prune_old_events(p_batch_size integer default 1000)
returns table (table_name text, deleted_rows bigint)
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_retention_days int := 180;
  v_cutoff timestamptz;
  v_batch_size int := greatest(1, coalesce(p_batch_size, 1000));
  v_deleted bigint;
  v_total bigint;
  v_table text;
  v_tables constant text[] := array['answer_events', 'leaderboard_events'];
begin
  begin
    select retain_event_days
      into v_retention_days
    from app.app_settings
    where id = true;
  exception
    when undefined_table then
      v_retention_days := 180;
  end;

  if v_retention_days is null or v_retention_days < 1 then
    v_retention_days := 180;
  end if;

  v_cutoff := timezone('utc', now()) - make_interval(days => v_retention_days);

  foreach v_table in array v_tables loop
    v_total := 0;

    loop
      begin
        execute format(
          'with pruned as (
             select ctid
             from public.%I
             where created_at < $1
             order by created_at
             limit $2
           )
           delete from public.%I t
           using pruned
           where t.ctid = pruned.ctid',
          v_table,
          v_table
        )
        using v_cutoff, v_batch_size;
      exception
        when undefined_table then
          v_deleted := 0;
          exit;
      end;

      get diagnostics v_deleted = row_count;

      exit when v_deleted = 0;

      v_total := v_total + v_deleted;
    end loop;

    return next (v_table, coalesce(v_total, 0));
  end loop;

  return;
end;
$$;

grant execute on function app.prune_old_events(integer) to postgres;
grant execute on function app.prune_old_events(integer) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'app_prune_old_events',
      '15 4 * * *',
      $$select app.prune_old_events();$$
    );
  end if;
end;
$$;

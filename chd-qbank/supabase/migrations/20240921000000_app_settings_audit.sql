create table if not exists app.app_settings_audit (
  id bigserial primary key,
  changed_at timestamptz not null default timezone('utc', now()),
  changed_by text,
  old_value jsonb not null,
  new_value jsonb not null
);

create or replace function app.log_app_settings_change()
returns trigger
language plpgsql
as $$
declare
  v_actor text := nullif(current_setting('request.jwt.claim.sub', true), '');
begin
  if v_actor is null then
    v_actor := nullif(current_setting('request.jwt.claim.email', true), '');
  end if;

  if v_actor is null then
    v_actor := nullif(current_setting('request.jwt.claim.role', true), '');
  end if;

  if v_actor is null then
    v_actor := session_user;
  end if;

  insert into app.app_settings_audit (changed_by, old_value, new_value)
  values (v_actor, to_jsonb(old), to_jsonb(new));

  return new;
end;
$$;

drop trigger if exists trg_audit_app_settings on app.app_settings;

create trigger trg_audit_app_settings
after update on app.app_settings
for each row
execute function app.log_app_settings_change();

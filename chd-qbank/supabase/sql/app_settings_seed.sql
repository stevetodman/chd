-- Default settings (safe for repeated runs)
insert into app_settings (key, value) values
  ('leaderboard_enabled', 'true')
on conflict (key) do update set value = excluded.value;

insert into app_settings (key, value) values
  ('maintenance_mode', 'false')
on conflict (key) do update set value = excluded.value;

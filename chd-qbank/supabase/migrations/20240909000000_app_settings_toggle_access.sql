-- Ensure maintenance_mode is readable by authenticated users alongside leaderboard_enabled
drop policy if exists "settings read leaderboard" on app_settings;

create policy "settings read toggles" on app_settings
for select using (
  auth.role() = 'authenticated'
  and key in ('leaderboard_enabled', 'maintenance_mode')
);

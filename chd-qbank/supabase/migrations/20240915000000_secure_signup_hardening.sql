begin;

-- Ensure legacy invite secrets are purged from source-controlled migrations.
delete from app_settings where key = 'invite_code';

-- Restrict idempotency metadata to the service role used by Edge Functions.
alter table if exists idempotency_keys enable row level security;

drop policy if exists "idempotency service role" on idempotency_keys;
create policy "idempotency service role" on idempotency_keys
for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;

-- Remove leaked invite code that was previously seeded via schema migrations.
delete from app_settings where key = 'invite_code' and value = 'CHD2025FALL';

delete from app_settings a
where a.key = 'invite_expires'
  and not exists (
    select 1
    from app_settings b
    where b.key = 'invite_code'
  );

-- Restrict idempotency key storage to privileged roles only.
revoke all on table idempotency_keys from anon;
revoke all on table idempotency_keys from authenticated;

alter table idempotency_keys enable row level security;

drop policy if exists "idempotency keys service role" on idempotency_keys;
create policy "idempotency keys service role" on idempotency_keys
for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

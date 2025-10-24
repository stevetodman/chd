begin;

delete from public.app_settings where key = 'invite_code';

alter table public.idempotency_keys enable row level security;

drop policy if exists "idempotency service role" on public.idempotency_keys;
create policy "idempotency service role" on public.idempotency_keys
for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;

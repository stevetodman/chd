-- Buckets to create in dashboard: murmurs, cxr, ekg, diagrams

-- Authenticated read; admin write for each bucket
create policy "murmurs read auth" on storage.objects
for select
to authenticated
using (bucket_id = 'murmurs');
create policy "murmurs write admin" on storage.objects
for all
to authenticated
using (bucket_id = 'murmurs' and (select app.is_admin()))
with check (bucket_id = 'murmurs' and (select app.is_admin()));

create policy "cxr read auth" on storage.objects
for select
to authenticated
using (bucket_id = 'cxr');
create policy "cxr write admin" on storage.objects
for all
to authenticated
using (bucket_id = 'cxr' and (select app.is_admin()))
with check (bucket_id = 'cxr' and (select app.is_admin()));

create policy "ekg read auth" on storage.objects
for select
to authenticated
using (bucket_id = 'ekg');
create policy "ekg write admin" on storage.objects
for all
to authenticated
using (bucket_id = 'ekg' and (select app.is_admin()))
with check (bucket_id = 'ekg' and (select app.is_admin()));

create policy "diagrams read auth" on storage.objects
for select
to authenticated
using (bucket_id = 'diagrams');
create policy "diagrams write admin" on storage.objects
for all
to authenticated
using (bucket_id = 'diagrams' and (select app.is_admin()))
with check (bucket_id = 'diagrams' and (select app.is_admin()));

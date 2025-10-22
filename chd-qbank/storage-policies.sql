-- Buckets to create in dashboard: murmurs, cxr, ekg, diagrams

-- Authenticated read; admin write for each bucket
drop policy if exists "murmurs read auth" on storage.objects;
create policy "murmurs read auth" on storage.objects
for select using (bucket_id = 'murmurs' and auth.role() = 'authenticated');
drop policy if exists "murmurs write admin" on storage.objects;
create policy "murmurs write admin" on storage.objects
for all using (bucket_id = 'murmurs' and (select app.is_admin()))
  with check (bucket_id = 'murmurs' and (select app.is_admin()));

drop policy if exists "cxr read auth" on storage.objects;
create policy "cxr read auth" on storage.objects
for select using (bucket_id = 'cxr' and auth.role() = 'authenticated');
drop policy if exists "cxr write admin" on storage.objects;
create policy "cxr write admin" on storage.objects
for all using (bucket_id = 'cxr' and (select app.is_admin()))
  with check (bucket_id = 'cxr' and (select app.is_admin()));

drop policy if exists "ekg read auth" on storage.objects;
create policy "ekg read auth" on storage.objects
for select using (bucket_id = 'ekg' and auth.role() = 'authenticated');
drop policy if exists "ekg write admin" on storage.objects;
create policy "ekg write admin" on storage.objects
for all using (bucket_id = 'ekg' and (select app.is_admin()))
  with check (bucket_id = 'ekg' and (select app.is_admin()));

drop policy if exists "diagrams read auth" on storage.objects;
create policy "diagrams read auth" on storage.objects
for select using (bucket_id = 'diagrams' and auth.role() = 'authenticated');
drop policy if exists "diagrams write admin" on storage.objects;
create policy "diagrams write admin" on storage.objects
for all using (bucket_id = 'diagrams' and (select app.is_admin()))
  with check (bucket_id = 'diagrams' and (select app.is_admin()));

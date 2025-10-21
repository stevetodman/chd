-- Buckets to create in dashboard: murmurs, cxr, ekg, diagrams

-- Authenticated read; admin write for each bucket
create policy "murmurs read auth" on storage.objects
for select using (bucket_id = 'murmurs' and auth.role() = 'authenticated');
create policy "murmurs write admin" on storage.objects
for all using (bucket_id='murmurs' and is_admin()) with check (bucket_id='murmurs' and is_admin());

create policy "cxr read auth" on storage.objects
for select using (bucket_id = 'cxr' and auth.role() = 'authenticated');
create policy "cxr write admin" on storage.objects
for all using (bucket_id='cxr' and is_admin()) with check (bucket_id='cxr' and is_admin());

create policy "ekg read auth" on storage.objects
for select using (bucket_id = 'ekg' and auth.role() = 'authenticated');
create policy "ekg write admin" on storage.objects
for all using (bucket_id='ekg' and is_admin()) with check (bucket_id='ekg' and is_admin());

create policy "diagrams read auth" on storage.objects
for select using (bucket_id = 'diagrams' and auth.role() = 'authenticated');
create policy "diagrams write admin" on storage.objects
for all using (bucket_id='diagrams' and is_admin()) with check (bucket_id='diagrams' and is_admin());

-- migrate:up

begin;

create schema if not exists app;

grant usage on schema app to authenticated;
grant usage on schema app to service_role;

create table if not exists app.app_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin'))
);

alter table app.app_roles enable row level security;

drop policy if exists "app roles service manage" on app.app_roles;
create policy "app roles service manage" on app.app_roles
  for all
  to service_role
  using (true)
  with check (true);

drop function if exists app.is_admin();
drop function if exists is_admin();

create function app.is_admin()
returns boolean
language plpgsql
security definer
set search_path = app, public
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  return exists (
    select 1
    from app_roles ar
    where ar.user_id = v_uid
      and ar.role = 'admin'
  );
end;
$$;

revoke execute on function app.is_admin() from public;
grant execute on function app.is_admin() to authenticated;
grant execute on function app.is_admin() to service_role;

insert into app.app_roles(user_id, role)
select id, 'admin'
from app_users
where role = 'admin'
on conflict (user_id) do update set role = excluded.role;

alter policy "users read self or admin" on app_users
  to authenticated
  using (((select auth.uid()) = id) or (select app.is_admin()));

alter policy "admin update users" on app_users
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "user update own alias" on app_users
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "settings read admin" on app_settings
  to authenticated
  using ((select app.is_admin()));

alter policy "settings read leaderboard" on app_settings
  to authenticated
  using (key = 'leaderboard_enabled');

alter policy "settings update admin" on app_settings
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "media read" on media_bundles
  to authenticated
  using (
    (select app.is_admin())
    or exists (
      select 1
      from questions q
      where q.media_bundle_id = media_bundles.id
        and q.status = 'published'
    )
  );

alter policy "media write admin" on media_bundles
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "questions read published" on questions
  to authenticated
  using ((status = 'published') or (select app.is_admin()));

alter policy "questions write admin" on questions
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "choices read if q published" on choices
  to authenticated
  using (
    exists (
      select 1
      from questions q
      where q.id = question_id
        and (q.status = 'published' or (select app.is_admin()))
    )
  );

alter policy "choices write admin" on choices
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "responses insert self" on responses
  to authenticated
  using (true)
  with check ((select auth.uid()) = user_id);

alter policy "responses read self" on responses
  to authenticated
  using (((select auth.uid()) = user_id) or (select app.is_admin()));

alter policy "responses update self" on responses
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "responses delete self" on responses
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "item_stats read" on item_stats
  to authenticated
  using (true);

alter policy "item_stats write admin" on item_stats
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "distractor_stats read" on distractor_stats
  to authenticated
  using (true);

alter policy "distractor_stats write admin" on distractor_stats
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "leader read" on leaderboard
  to authenticated
  using (
    (select app.is_admin())
    or (select auth.uid()) = user_id
    or leaderboard_is_enabled()
  );

alter policy "leader manage admin" on leaderboard
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "aliases read" on public_aliases
  to authenticated
  using (
    (select app.is_admin())
    or (select auth.uid()) = user_id
    or leaderboard_is_enabled()
  );

alter policy "aliases write admin" on public_aliases
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "murmur items read published" on murmur_items
  to authenticated
  using ((status = 'published') or (select app.is_admin()));

alter policy "murmur items write admin" on murmur_items
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "murmur options read" on murmur_options
  to authenticated
  using (
    (select app.is_admin())
    or exists (
      select 1
      from murmur_items mi
      where mi.id = murmur_options.item_id
        and mi.status = 'published'
    )
  );

alter policy "murmur options write admin" on murmur_options
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "murmur attempts insert self" on murmur_attempts
  to authenticated
  using (true)
  with check ((select auth.uid()) = user_id);

alter policy "murmur attempts read self" on murmur_attempts
  to authenticated
  using (((select auth.uid()) = user_id) or (select app.is_admin()));

alter policy "cxr items read published" on cxr_items
  to authenticated
  using ((status = 'published') or (select app.is_admin()));

alter policy "cxr items write admin" on cxr_items
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "cxr labels read" on cxr_labels
  to authenticated
  using (
    (select app.is_admin())
    or exists (
      select 1
      from cxr_items ci
      where ci.id = cxr_labels.item_id
        and ci.status = 'published'
    )
  );

alter policy "cxr labels write admin" on cxr_labels
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

alter policy "cxr attempts insert self" on cxr_attempts
  to authenticated
  using (true)
  with check ((select auth.uid()) = user_id);

alter policy "cxr attempts read self" on cxr_attempts
  to authenticated
  using (((select auth.uid()) = user_id) or (select app.is_admin()));

alter policy "leaderboard events admin" on leaderboard_events
  to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

commit;

create index concurrently if not exists idx_questions_media_bundle_published
  on questions(media_bundle_id) where status = 'published';
create index concurrently if not exists idx_murmur_attempts_user
  on murmur_attempts(user_id);
create index concurrently if not exists idx_cxr_attempts_user
  on cxr_attempts(user_id);

-- migrate:down

drop index if exists idx_cxr_attempts_user;
drop index if exists idx_murmur_attempts_user;
drop index if exists idx_questions_media_bundle_published;

begin;

alter policy "leaderboard events admin" on leaderboard_events
  to public
  using (is_admin())
  with check (is_admin());

alter policy "cxr attempts read self" on cxr_attempts
  to public
  using (auth.uid()=user_id or is_admin());

alter policy "cxr attempts insert self" on cxr_attempts
  to public
  using (true)
  with check (auth.uid()=user_id);

alter policy "cxr labels write admin" on cxr_labels
  to public
  using (is_admin())
  with check (is_admin());

alter policy "cxr labels read" on cxr_labels
  to public
  using (
    is_admin()
    or (
      auth.role()='authenticated'
      and exists (
        select 1
        from cxr_items ci
        where ci.id = cxr_labels.item_id
          and ci.status = 'published'
      )
    )
  );

alter policy "cxr items write admin" on cxr_items
  to public
  using (is_admin())
  with check (is_admin());

alter policy "cxr items read published" on cxr_items
  to public
  using ( ((status='published' and auth.role()='authenticated') or is_admin()) );

alter policy "murmur attempts read self" on murmur_attempts
  to public
  using (auth.uid()=user_id or is_admin());

alter policy "murmur attempts insert self" on murmur_attempts
  to public
  using (true)
  with check (auth.uid()=user_id);

alter policy "murmur options write admin" on murmur_options
  to public
  using (is_admin())
  with check (is_admin());

alter policy "murmur options read" on murmur_options
  to public
  using (
    is_admin()
    or (
      auth.role()='authenticated'
      and exists (
        select 1
        from murmur_items mi
        where mi.id = murmur_options.item_id
          and mi.status = 'published'
      )
    )
  );

alter policy "murmur items write admin" on murmur_items
  to public
  using (is_admin())
  with check (is_admin());

alter policy "murmur items read published" on murmur_items
  to public
  using ( ((status='published' and auth.role()='authenticated') or is_admin()) );

alter policy "aliases write admin" on public_aliases
  to public
  using (is_admin())
  with check (is_admin());

alter policy "aliases read" on public_aliases
  to public
  using (
    is_admin()
    or auth.uid() = user_id
    or leaderboard_is_enabled()
  );

alter policy "leader manage admin" on leaderboard
  to public
  using (is_admin())
  with check (is_admin());

alter policy "leader read" on leaderboard
  to public
  using (
    is_admin()
    or auth.uid() = user_id
    or leaderboard_is_enabled()
  );

alter policy "distractor_stats write admin" on distractor_stats
  to public
  using (is_admin())
  with check (is_admin());

alter policy "distractor_stats read" on distractor_stats
  to public
  using (true);

alter policy "item_stats write admin" on item_stats
  to public
  using (is_admin())
  with check (is_admin());

alter policy "item_stats read" on item_stats
  to public
  using (true);

alter policy "responses delete self" on responses
  to public
  using (auth.uid() = user_id);

alter policy "responses update self" on responses
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter policy "responses read self" on responses
  to public
  using (auth.uid() = user_id or is_admin());

alter policy "responses insert self" on responses
  to public
  using (true)
  with check (auth.uid() = user_id);

alter policy "choices write admin" on choices
  to public
  using (is_admin())
  with check (is_admin());

alter policy "choices read if q published" on choices
  to public
  using (
    auth.role() = 'authenticated' and
    exists(select 1 from questions q where q.id = question_id and (q.status='published' or is_admin()))
  );

alter policy "questions write admin" on questions
  to public
  using (is_admin())
  with check (is_admin());

alter policy "questions read published" on questions
  to public
  using ( ((status = 'published' and auth.role() = 'authenticated') or is_admin()) );

alter policy "media write admin" on media_bundles
  to public
  using (is_admin())
  with check (is_admin());

alter policy "media read" on media_bundles
  to public
  using (
    is_admin()
    or (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from questions q
        where q.media_bundle_id = media_bundles.id
          and q.status = 'published'
      )
    )
  );

alter policy "settings update admin" on app_settings
  to public
  using (is_admin())
  with check (is_admin());

alter policy "settings read leaderboard" on app_settings
  to public
  using (
    key = 'leaderboard_enabled' and auth.role() = 'authenticated'
  );

alter policy "settings read admin" on app_settings
  to public
  using (is_admin());

alter policy "user update own alias" on app_users
  to public
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter policy "admin update users" on app_users
  to public
  using (is_admin());

alter policy "users read self or admin" on app_users
  to public
  using (auth.uid() = id or is_admin());

drop function if exists app.is_admin();

create or replace function is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from app_users au
    where au.id = auth.uid() and au.role = 'admin'
  );
$$;

revoke execute on function is_admin() from public;
grant execute on function is_admin() to authenticated;
grant execute on function is_admin() to service_role;

alter table app.app_roles disable row level security;
drop policy if exists "app roles service manage" on app.app_roles;
drop table if exists app.app_roles;

drop schema if exists app;

commit;

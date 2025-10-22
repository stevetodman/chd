-- Enable useful extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_stat_statements;
create extension if not exists pg_cron;

-- ROLES
create type user_role as enum ('student','admin');

-- USERS (profile)
create table if not exists app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  alias text,
  alias_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (alias)
);

-- SETTINGS (invite code) -- read only by admin; Edge Function (service role) reads it server-side
create table if not exists app_settings (
  key text primary key,
  value text not null
);
insert into app_settings(key, value)
  values ('invite_code','CHD2025FALL')
on conflict (key) do nothing;
insert into app_settings(key, value)
  values ('invite_expires','2025-11-30')
on conflict (key) do nothing;
insert into app_settings(key, value)
  values ('leaderboard_enabled','true')
on conflict (key) do nothing;

-- MEDIA
create table if not exists media_bundles (
  id uuid primary key default gen_random_uuid(),
  murmur_url text,
  cxr_url text,
  ekg_url text,
  diagram_url text,
  alt_text text
);

-- QUESTIONS (versioned)
create type item_status as enum ('draft','published','archived');

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references questions(id) on delete set null,
  version int not null default 1,
  status item_status not null default 'draft',
  slug text unique,
  stem_md text not null,
  lead_in text,
  explanation_brief_md text not null,
  explanation_deep_md text,
  difficulty_target int check (difficulty_target between 1 and 5),
  bloom text,
  topic text,
  subtopic text,
  lesion text,
  lecture_link text,
  media_bundle_id uuid references media_bundles(id),
  context_panels jsonb,
  correct_choice_id uuid,
  updated_by uuid references app_users(id),
  updated_at timestamptz not null default now()
);

create table if not exists choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null check (label in ('A','B','C','D','E')),
  text_md text not null,
  is_correct boolean not null default false,
  constraint label_unique_per_question unique (question_id, label)
);
create unique index if not exists uniq_correct_choice_per_question
  on choices(question_id) where is_correct;

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  choice_id uuid references choices(id) on delete restrict,
  is_correct boolean not null,
  ms_to_answer int,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ms_nonneg check (ms_to_answer is null or ms_to_answer between 0 and 600000)
);

create table if not exists item_stats (
  question_id uuid primary key references questions(id) on delete cascade,
  n_attempts int not null default 0,
  p_value double precision,
  discrimination_pb double precision,
  avg_time_ms double precision,
  last_computed_at timestamptz
);

create table if not exists distractor_stats (
  question_id uuid not null references questions(id) on delete cascade,
  choice_id uuid not null references choices(id) on delete cascade,
  picked_count int not null default 0,
  pick_rate double precision,
  primary key (question_id, choice_id)
);

create table if not exists leaderboard (
  user_id uuid primary key references app_users(id) on delete cascade,
  points int not null default 0,
  rank int
);

create table if not exists public_aliases (
  user_id uuid primary key references app_users(id) on delete cascade,
  alias text not null
);

create table if not exists murmur_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  media_url text not null,
  prompt_md text,
  rationale_md text,
  lesion text,
  topic text,
  difficulty int check (difficulty between 1 and 5),
  status item_status not null default 'published',
  updated_by uuid references app_users(id),
  updated_at timestamptz not null default now()
);

create table if not exists murmur_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references murmur_items(id) on delete cascade,
  label text not null check (label in ('A','B','C','D')),
  text_md text not null,
  is_correct boolean not null default false,
  unique (item_id, label)
);
create unique index if not exists uniq_murmur_correct_per_item
  on murmur_options(item_id) where is_correct;

create table if not exists murmur_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  item_id uuid not null references murmur_items(id) on delete cascade,
  option_id uuid not null references murmur_options(id) on delete restrict,
  is_correct boolean not null,
  ms_to_answer int check (ms_to_answer between 0 and 600000),
  created_at timestamptz not null default now()
);

create table if not exists cxr_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  image_url text not null,
  caption_md text,
  lesion text,
  topic text,
  status item_status not null default 'published',
  updated_by uuid references app_users(id),
  updated_at timestamptz not null default now()
);

create table if not exists cxr_labels (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references cxr_items(id) on delete cascade,
  label text not null,
  x double precision not null check (x between 0 and 1),
  y double precision not null check (y between 0 and 1),
  w double precision not null check (w between 0 and 1),
  h double precision not null check (h between 0 and 1),
  is_correct boolean not null default false,
  unique (item_id, label)
);

create table if not exists cxr_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  item_id uuid not null references cxr_items(id) on delete cascade,
  is_correct boolean not null,
  detail jsonb,
  ms_to_answer int check (ms_to_answer between 0 and 600000),
  created_at timestamptz not null default now()
);

alter table app_users enable row level security;
alter table app_settings enable row level security;
alter table media_bundles enable row level security;
alter table questions enable row level security;
alter table choices enable row level security;
alter table responses enable row level security;
alter table item_stats enable row level security;
alter table distractor_stats enable row level security;
alter table leaderboard enable row level security;
alter table public_aliases enable row level security;
alter table murmur_items enable row level security;
alter table murmur_options enable row level security;
alter table murmur_attempts enable row level security;
alter table cxr_items enable row level security;
alter table cxr_labels enable row level security;
alter table cxr_attempts enable row level security;

create or replace function is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from app_users au
    where au.id = auth.uid() and au.role = 'admin'
  );
$$;

create or replace function leaderboard_is_enabled() returns boolean
language sql stable as $$
  select exists (
    select 1
    from app_settings
    where key = 'leaderboard_enabled'
      and lower(value) = 'true'
  );
$$;

create policy "users read self or admin" on app_users
for select using (auth.uid() = id or is_admin());

create policy "admin update users" on app_users
for update using (is_admin());
create policy "user update own alias" on app_users
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings read admin" on app_settings
for select using (is_admin());
create policy "settings read leaderboard" on app_settings
for select using (
  key = 'leaderboard_enabled' and auth.role() = 'authenticated'
);
create policy "settings update admin" on app_settings
for update using (is_admin());

create policy "media read" on media_bundles
for select using (
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
create policy "media write admin" on media_bundles
for all using (is_admin()) with check (is_admin());

create policy "questions read published" on questions
for select using ( ((status = 'published' and auth.role() = 'authenticated') or is_admin()) );
create policy "questions write admin" on questions
for all using (is_admin()) with check (is_admin());

create policy "choices read if q published" on choices
for select using (
  auth.role() = 'authenticated' and
  exists(select 1 from questions q where q.id = question_id and (q.status='published' or is_admin()))
);
create policy "choices write admin" on choices
for all using (is_admin()) with check (is_admin());

create policy "responses insert self" on responses
for insert with check (auth.uid() = user_id);
create policy "responses read self" on responses
for select using (auth.uid() = user_id or is_admin());
create policy "responses update self" on responses
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "responses delete self" on responses
for delete using (auth.uid() = user_id);

create policy "item_stats read" on item_stats
for select using (true);
create policy "item_stats write admin" on item_stats
for all using (is_admin()) with check (is_admin());
create policy "distractor_stats read" on distractor_stats
for select using (true);
create policy "distractor_stats write admin" on distractor_stats
for all using (is_admin()) with check (is_admin());

create policy "leader read" on leaderboard
for select using (
  is_admin()
  or auth.uid() = user_id
  or leaderboard_is_enabled()
);
create policy "leader upsert own" on leaderboard
for all using (auth.uid() = user_id or is_admin()) with check (auth.uid() = user_id or is_admin());

create policy "aliases read" on public_aliases
for select using (
  is_admin()
  or auth.uid() = user_id
  or leaderboard_is_enabled()
);
create policy "aliases write admin" on public_aliases
for all using (is_admin()) with check (is_admin());

create policy "murmur items read published" on murmur_items
for select using ( ((status='published' and auth.role()='authenticated') or is_admin()) );
create policy "murmur items write admin" on murmur_items
for all using (is_admin()) with check (is_admin());
create policy "murmur options read" on murmur_options
for select using (
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
create policy "murmur options write admin" on murmur_options
for all using (is_admin()) with check (is_admin());
create policy "murmur attempts insert self" on murmur_attempts
for insert with check (auth.uid()=user_id);
create policy "murmur attempts read self" on murmur_attempts
for select using (auth.uid()=user_id or is_admin());

create policy "cxr items read published" on cxr_items
for select using ( ((status='published' and auth.role()='authenticated') or is_admin()) );
create policy "cxr items write admin" on cxr_items
for all using (is_admin()) with check (is_admin());
create policy "cxr labels read" on cxr_labels
for select using (
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
create policy "cxr labels write admin" on cxr_labels
for all using (is_admin()) with check (is_admin());
create policy "cxr attempts insert self" on cxr_attempts
for insert with check (auth.uid()=user_id);
create policy "cxr attempts read self" on cxr_attempts
for select using (auth.uid()=user_id or is_admin());

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into app_users(id, role, alias, alias_locked)
  values (new.id, 'student', null, false)
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function sync_correct_choice() returns trigger language plpgsql as $$
begin
  if (tg_op='INSERT' or tg_op='UPDATE') and new.is_correct then
    update questions set correct_choice_id = new.id where id = new.question_id;
  end if;
  if tg_op='UPDATE' and old.is_correct and not new.is_correct then
    update questions set correct_choice_id = null where id = new.question_id and correct_choice_id = old.id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_sync_correct_choice on choices;
create trigger trg_sync_correct_choice after insert or update on choices
for each row execute function sync_correct_choice();

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_q_updated on questions;
create trigger trg_q_updated before update on questions for each row execute function set_updated_at();
drop trigger if exists trg_murmur_updated on murmur_items;
create trigger trg_murmur_updated before update on murmur_items for each row execute function set_updated_at();
drop trigger if exists trg_cxr_updated on cxr_items;
create trigger trg_cxr_updated before update on cxr_items for each row execute function set_updated_at();

create or replace function sync_public_alias() returns trigger language plpgsql as $$
begin
  if (tg_op='INSERT') then
    insert into public_aliases(user_id, alias) values (new.id, new.alias)
    on conflict (user_id) do update set alias=excluded.alias;
  elsif (tg_op='UPDATE') then
    update public_aliases set alias=new.alias where user_id=new.id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_sync_public_alias on app_users;
create trigger trg_sync_public_alias after insert or update of alias on app_users
for each row execute function sync_public_alias();

create or replace function lock_alias_once() returns trigger language plpgsql as $$
begin
  if new.alias is distinct from old.alias then
    if old.alias is null then
      -- Service seeding the first alias keeps it editable
      new.alias_locked := false;
    elsif old.alias_locked then
      raise exception 'Alias already locked';
    else
      new.alias_locked := true;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_lock_alias_once on app_users;
create trigger trg_lock_alias_once before update on app_users
for each row execute function lock_alias_once();

create or replace function upsert_question_from_csv(row_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public as $$
declare
  v_slug text := trim(coalesce(row_data->>'slug', ''));
  v_question_id uuid;
  v_existing_media uuid;
  v_media_id uuid;
  v_has_media boolean :=
    coalesce(nullif(row_data->>'media_murmur', ''), '') <> '' or
    coalesce(nullif(row_data->>'media_cxr', ''), '') <> '' or
    coalesce(nullif(row_data->>'media_ekg', ''), '') <> '' or
    coalesce(nullif(row_data->>'media_diagram', ''), '') <> '' or
    coalesce(nullif(row_data->>'alt_text', ''), '') <> '';
  v_status item_status := coalesce(nullif(lower(row_data->>'status'), ''), 'draft')::item_status;
  v_choice_labels text[] := array['A','B','C','D','E'];
  v_label text;
  v_choice_text text;
  v_correct_label text := upper(coalesce(nullif(row_data->>'correct_label', ''), ''));
  v_difficulty int := case when coalesce(row_data->>'difficulty', '') ~ '^[0-9]+$' then (row_data->>'difficulty')::int else null end;
begin
  if v_slug = '' then
    raise exception 'slug required';
  end if;

  select id, media_bundle_id into v_question_id, v_existing_media
  from questions
  where slug = v_slug
  limit 1;

  if v_has_media then
    if v_existing_media is not null then
      update media_bundles
        set murmur_url = nullif(row_data->>'media_murmur', ''),
            cxr_url = nullif(row_data->>'media_cxr', ''),
            ekg_url = nullif(row_data->>'media_ekg', ''),
            diagram_url = nullif(row_data->>'media_diagram', ''),
            alt_text = nullif(row_data->>'alt_text', '')
      where id = v_existing_media
      returning id into v_media_id;
    else
      insert into media_bundles(murmur_url, cxr_url, ekg_url, diagram_url, alt_text)
      values (
        nullif(row_data->>'media_murmur', ''),
        nullif(row_data->>'media_cxr', ''),
        nullif(row_data->>'media_ekg', ''),
        nullif(row_data->>'media_diagram', ''),
        nullif(row_data->>'alt_text', '')
      )
      returning id into v_media_id;
    end if;
  else
    v_media_id := v_existing_media;
  end if;

  if v_question_id is null then
    insert into questions (
      slug,
      stem_md,
      lead_in,
      explanation_brief_md,
      explanation_deep_md,
      topic,
      subtopic,
      lesion,
      difficulty_target,
      bloom,
      lecture_link,
      status,
      media_bundle_id
    )
    values (
      v_slug,
      row_data->>'stem_md',
      nullif(row_data->>'lead_in', ''),
      row_data->>'explanation_brief_md',
      nullif(row_data->>'explanation_deep_md', ''),
      nullif(row_data->>'topic', ''),
      nullif(row_data->>'subtopic', ''),
      nullif(row_data->>'lesion', ''),
      v_difficulty,
      nullif(row_data->>'bloom', ''),
      nullif(row_data->>'lecture_link', ''),
      v_status,
      v_media_id
    )
    returning id into v_question_id;
  else
    update questions
    set stem_md = row_data->>'stem_md',
        lead_in = nullif(row_data->>'lead_in', ''),
        explanation_brief_md = row_data->>'explanation_brief_md',
        explanation_deep_md = nullif(row_data->>'explanation_deep_md', ''),
        topic = nullif(row_data->>'topic', ''),
        subtopic = nullif(row_data->>'subtopic', ''),
        lesion = nullif(row_data->>'lesion', ''),
        difficulty_target = v_difficulty,
        bloom = nullif(row_data->>'bloom', ''),
        lecture_link = nullif(row_data->>'lecture_link', ''),
        status = v_status,
        media_bundle_id = v_media_id
    where id = v_question_id
    returning id into v_question_id;
  end if;

  foreach v_label in array v_choice_labels
  loop
    v_choice_text := nullif(row_data->>concat('choice', v_label), '');
    if v_choice_text is null then
      continue;
    end if;
    insert into choices(question_id, label, text_md, is_correct)
    values (v_question_id, v_label, v_choice_text, v_label = v_correct_label)
    on conflict (question_id, label) do update
      set text_md = excluded.text_md,
          is_correct = excluded.is_correct;
  end loop;

  return v_question_id;
end;
$$;

create or replace function import_question_rows(rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public as $$
declare
  item jsonb;
  processed int := 0;
  errors jsonb := '[]'::jsonb;
begin
  if not is_admin() then
    raise exception 'Admin privileges required';
  end if;

  if rows is null or jsonb_typeof(rows) <> 'array' then
    raise exception 'rows must be an array';
  end if;

  for item in select value from jsonb_array_elements(rows) as t(value)
  loop
    begin
      perform upsert_question_from_csv(item);
      processed := processed + 1;
    exception when others then
      errors := errors || jsonb_build_array(jsonb_build_object('slug', item->>'slug', 'error', SQLERRM));
    end;
  end loop;

  return jsonb_build_object('processed', processed, 'errors', errors);
end;
$$;

create or replace function leaderboard_weekly_entries()
returns table(user_id uuid, points bigint)
language sql
security definer
set search_path = public
as $$
  select user_id, sum(points) as points
  from (
    select user_id, 1 as points, created_at from responses where is_correct
    union all
    select user_id, 1 as points, created_at from murmur_attempts where is_correct
    union all
    select user_id, 1 as points, created_at from cxr_attempts where is_correct
  ) e
  where created_at >= date_trunc('week', timezone('utc', now()))
  group by user_id
  order by points desc, user_id
  limit 100;
$$;

create or replace view leaderboard_weekly as
select * from leaderboard_weekly_entries();

create or replace view item_stats_public as
select question_id,
       case when n_attempts >= 30 then p_value end as p_value,
       case when n_attempts >= 30 then discrimination_pb end as discrimination_pb,
       avg_time_ms, n_attempts, last_computed_at
from item_stats;

create or replace function heatmap_by_lesion_topic()
returns table(lesion text, topic text, attempts int, correct_rate double precision)
language sql stable as $$
  select q.lesion,
         q.topic,
         count(r.id) as attempts,
         coalesce(avg((r.is_correct)::int)::float, 0) as correct_rate
  from questions q
  left join responses r on r.question_id = q.id
  where q.status = 'published'
  group by q.lesion, q.topic;
$$;

create or replace function increment_points(delta int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  insert into leaderboard(user_id, points)
  values (auth.uid(), delta)
  on conflict (user_id) do update set points = leaderboard.points + delta;
end;
$$;

create or replace function dashboard_metrics()
returns table(
  total_attempts bigint,
  correct_attempts bigint,
  flagged_count bigint,
  weekly_points bigint,
  all_time_points bigint
)
language plpgsql
security definer
set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_week_start timestamptz := date_trunc('week', timezone('utc', now()));
begin
  if v_user is null then
    raise exception 'auth required';
  end if;

  return query
  select
    (select count(*) from responses where user_id = v_user)::bigint,
    (select count(*) from responses where user_id = v_user and is_correct)::bigint,
    (select count(*) from responses where user_id = v_user and flagged)::bigint,
    (
      (select count(*) from responses where user_id = v_user and is_correct and created_at >= v_week_start) +
      (select count(*) from murmur_attempts where user_id = v_user and is_correct and created_at >= v_week_start) +
      (select count(*) from cxr_attempts where user_id = v_user and is_correct and created_at >= v_week_start)
    )::bigint,
    (
      (select count(*) from responses where user_id = v_user and is_correct) +
      (select count(*) from murmur_attempts where user_id = v_user and is_correct) +
      (select count(*) from cxr_attempts where user_id = v_user and is_correct)
    )::bigint;
end;
$$;

create index if not exists idx_questions_status_topic on questions(status, topic, lesion);
create index if not exists idx_responses_user_time on responses(user_id, created_at desc);
create index if not exists idx_responses_question on responses(question_id);
create index if not exists idx_item_stats_attempts on item_stats(n_attempts);

create or replace function grant_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'admin required';
  end if;

  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'No user %', p_email;
  end if;

  update app_users set role = 'admin' where id = v_id;
  if not found then
    raise exception 'No profile for %', p_email;
  end if;
end;
$$;

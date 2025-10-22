begin;

-- Convert questions.status from text to enum if necessary.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'status'
      and data_type = 'text'
  ) then
    if not exists (
      select 1 from pg_type where typname = 'question_status'
    ) then
      create type question_status as enum ('draft', 'published', 'archived');
    end if;

    alter table public.questions
      add column status_enum question_status;

    update public.questions
    set status_enum = case
      when status in ('draft', 'published', 'archived') then status::question_status
      else 'draft'::question_status
    end;

    alter table public.questions
      alter column status_enum set default 'draft'::question_status;

    alter table public.questions
      alter column status_enum set not null;

    alter table public.questions
      drop column status;

    alter table public.questions
      rename column status_enum to status;
  end if;
end;
$$;

-- Ensure each slug is unique and present before enforcing constraints.
with deduped as (
  select
    id,
    slug,
    row_number() over (partition by slug order by updated_at, id) as rn
  from public.questions
  where slug is not null
)
update public.questions q
set slug = q.slug || '-' || (d.rn - 1)::text
from deduped d
where q.id = d.id
  and d.rn > 1;

update public.questions
set slug = concat('legacy-', id::text)
where slug is null;

alter table public.questions
  drop constraint if exists questions_slug_key;

alter table public.questions
  alter column slug set not null;

-- Remove duplicate answer_events so that response_id is unique going forward.
with ranked_events as (
  select
    id,
    row_number() over (
      partition by response_id
      order by created_at desc, id desc
    ) as rn
  from public.answer_events
)
delete from public.answer_events ae
using ranked_events r
where ae.id = r.id
  and r.rn > 1;

-- Remove responses that reference missing parents before re-adding FKs.
delete from public.responses r
where not exists (
    select 1 from public.questions q where q.id = r.question_id
  )
   or not exists (
    select 1 from public.app_users u where u.id = r.user_id
  );

alter table public.responses
  drop constraint if exists responses_question_id_fkey;

alter table public.responses
  drop constraint if exists responses_user_id_fkey;

alter table public.responses
  add constraint responses_question_id_fkey
  foreign key (question_id) references public.questions(id) on delete cascade;

alter table public.responses
  add constraint responses_user_id_fkey
  foreign key (user_id) references public.app_users(id) on delete cascade;

-- Prepare for a unique index on response_id.
drop index if exists public.idx_answer_events_response;

commit;

-- Enforce uniqueness of slugs without locking writes.
create unique index concurrently if not exists questions_slug_unique
  on public.questions(slug);

-- Add supporting indexes concurrently.
create unique index concurrently if not exists answer_events_response_unique
  on public.answer_events(response_id);

create index concurrently if not exists responses_question_user_idx
  on public.responses(question_id, user_id);

begin;

-- Refresh trigger implementation to be insert-only and resilient to errors.
create or replace function public.log_answer_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int := case when new.is_correct then 1 else 0 end;
begin
  if exists (
    select 1
    from public.answer_events ae
    where ae.response_id = new.id
      and ae.user_id = new.user_id
      and ae.question_id = new.question_id
      and ae.is_correct = new.is_correct
      and ae.points = v_points
  ) then
    return new;
  end if;

  insert into public.answer_events(response_id, user_id, question_id, is_correct, points, effective_at)
  values (new.id, new.user_id, new.question_id, new.is_correct, v_points, new.created_at);

  return new;
exception
  when others then
    raise log 'log_answer_event failed for response %: %', new.id, sqlerrm;
    return null;
end;
$$;

drop trigger if exists trg_log_answer_event on public.responses;

create trigger trg_log_answer_event
after insert on public.responses
for each row
execute function public.log_answer_event();

commit;

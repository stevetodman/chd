-- Ensure questions.context_panels is never null and defaults to an empty array
update questions
set context_panels = '[]'::jsonb
where context_panels is null;

alter table questions
  alter column context_panels set default '[]'::jsonb;

alter table questions
  alter column context_panels set not null;

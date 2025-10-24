begin;

alter table public.qbank_questions
  alter column context_panels set default '[]'::jsonb,
  alter column lab_panels set default '[]'::jsonb,
  alter column formula_panels set default '[]'::jsonb;

commit;

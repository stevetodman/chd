create or replace function is_admin() returns boolean
language sql stable as $$
  select case
    when auth.role() = 'service_role' then true
    when auth.uid() is null then false
    else exists (
      select 1
      from app_users au
      where au.id = auth.uid()
        and au.role = 'admin'
    )
  end;
$$;

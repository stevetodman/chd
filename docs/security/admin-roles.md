# Admin Role Management

The application grants elevated access based on entries in the `app_roles` bridge table. Each mapping links a Supabase `auth.users.id` to a named capability such as `admin`. The front-end checks this relationship at sign-in and enables privileged routes (question management, analytics refresh tools, storage uploads) when it finds the `admin` role.

## Granting admin access

1. Identify the user’s UUID in Supabase (`Authentication → Users` or via SQL: `select id, email from auth.users order by email;`).
2. Connect to the project using the SQL editor or `psql`/`supabase db remote psql`.
3. Insert the mapping:

```sql
insert into app_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin')
on conflict (user_id, role) do nothing;
```

The next authentication refresh promotes the user to admin. Have them sign out and back in to pick up the change.

## Revoking admin access

1. Confirm the UUID you intend to demote.
2. Remove the mapping:

```sql
delete from app_roles
where user_id = '00000000-0000-0000-0000-000000000000'
  and role = 'admin';
```

Once the row disappears the UI hides privileged routes for the next session.

## Auditing

Run this query periodically to verify who currently holds elevated access:

```sql
select u.email, r.inserted_at
from app_roles r
join auth.users u on u.id = r.user_id
where r.role = 'admin'
order by r.inserted_at desc;
```

For production, store query results alongside change-management tickets so you can reconcile who approved each role change.

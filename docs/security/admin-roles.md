# Admin role management runbook

Elevated privileges in CHD QBank are controlled through the `app_roles` bridge table. Each row links a Supabase `auth.users.id` to a named capability (currently `admin`). The React client checks this relationship at sign-in and unlocks privileged routes—analytics refresh tools, content moderation panels, storage uploads—when it detects the `admin` role.

## Granting admin access

1. Retrieve the user's UUID from Supabase (`Authentication → Users` or `select id, email from auth.users order by email;`).
2. Connect to the project using the Supabase SQL editor, `psql`, or `supabase db remote psql`.
3. Insert the mapping:

   ```sql
   insert into app_roles (user_id, role)
   values ('00000000-0000-0000-0000-000000000000', 'admin')
   on conflict (user_id, role) do nothing;
   ```

4. Ask the user to sign out and back in so the new role is reflected in their session.

## Revoking admin access

1. Confirm the UUID to demote.
2. Delete the mapping:

   ```sql
   delete from app_roles
   where user_id = '00000000-0000-0000-0000-000000000000'
     and role = 'admin';
   ```

3. The UI hides privileged routes the next time the user authenticates.

## Auditing

Run this query periodically to review current administrators:

```sql
select u.email, r.inserted_at
from app_roles r
join auth.users u on u.id = r.user_id
where r.role = 'admin'
order by r.inserted_at desc;
```

Store query results alongside change-management tickets for production so you can reconcile approvals during audits.

## Operational notes

- All role assignments are scoped to the Supabase project; remember to update staging and production independently.
- Invite codes do not automatically grant elevated access—roles must be assigned manually through the workflow above.
- When rotating service-role keys or re-seeding environments, re-run the audit query to verify the expected admins are present.

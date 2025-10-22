# RLS Reference

- All domain tables enforce Row Level Security by default. Never `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` in production.
- Students receive read access only to published items and may only insert their own responses/attempts.
- Admin users (role = `admin`) manage content, analytics materializations, and storage uploads.
- Service roles (Edge Functions, cron tasks) bypass RLS; keep service keys server-side only and rotate them whenever policies change.
- When adding new tables, define policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` in the same migration to prevent gaps.
- Prefer SECURITY DEFINER functions for administrative dashboards so UI clients never handle elevated keys directly.
- Document policy intent inside the SQL migration—future maintainers rely on comments to reason about access boundaries.

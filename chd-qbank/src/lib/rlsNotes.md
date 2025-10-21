# RLS Reference

- All domain tables enforce Row Level Security by default.
- Students receive read access only to published items and may only insert their own responses/attempts.
- Admin users (role = `admin`) manage content, analytics materializations, and storage uploads.
- Edge Functions and cron tasks run with service role credentials and bypass RLS; keep service keys server-side only.

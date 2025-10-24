# Supabase Policy Reference

## Row-level security overview
- Row-level security (RLS) is enabled on every user-facing table, including question content, responses, analytics rollups, and leaderboard data. This ensures that PostgREST and RPC calls always enforce policy checks before returning or mutating data.【F:chd-qbank/schema.sql†L367-L384】【F:chd-qbank/schema.sql†L1070-L1073】
- The helper function `is_admin()` evaluates whether the requester is using the `service_role` key or is mapped to an admin profile. Policies defer to this helper so that administrators retain full access without duplicating logic across tables, while students stay confined to their own rows.【F:chd-qbank/schema.sql†L386-L398】
- Feature toggles such as the public leaderboard rely on `leaderboard_is_enabled()` to allow authenticated users to opt in only when the toggle is active, while still permitting administrators to audit data regardless of toggle state.【F:chd-qbank/schema.sql†L400-L491】

## Table policies
The following sections summarize effective read and write access for each table. “Write” covers `INSERT`, `UPDATE`, and `DELETE` unless otherwise noted.

### `app_users`
- **Read:** Users can read their own profile rows; administrators can read all rows.【F:chd-qbank/schema.sql†L410-L411】
- **Write:** Administrators can update any profile; users can update only their own alias field (which is locked after the first change).【F:chd-qbank/schema.sql†L413-L418】【F:chd-qbank/schema.sql†L602-L618】
- **Effect:** Prevents lateral data exposure between students while allowing limited self-service customization.

### `idempotency_keys`
- **Read/Write:** Only the service role may access or modify idempotency records, preventing leakage of backend bookkeeping tokens to regular clients.【F:chd-qbank/schema.sql†L428-L432】

### `app_settings`
- **Read:** Administrators can read all settings; authenticated users can read only the whitelisted feature toggles needed by the client app.【F:chd-qbank/schema.sql†L418-L426】
- **Write:** Only administrators may update settings, ensuring operational controls cannot be toggled by students.【F:chd-qbank/schema.sql†L425-L426】

### `media_bundles`
- **Read:** Administrators can view everything. Authenticated users may view media only when attached to a published question, which prevents previewing unreleased content.【F:chd-qbank/schema.sql†L434-L446】
- **Write:** Restricted to administrators to guard copyright-sensitive assets.【F:chd-qbank/schema.sql†L447-L448】

### `questions`
- **Read:** Authenticated users can fetch published questions; administrators retain full access for editorial workflows.【F:chd-qbank/schema.sql†L450-L451】
- **Write:** Limited to administrators to control official content changes.【F:chd-qbank/schema.sql†L452-L453】

### `choices`
- **Read:** Authenticated users can read choices only for published questions, preserving secrecy of drafts; administrators bypass the restriction.【F:chd-qbank/schema.sql†L455-L459】
- **Write:** Only administrators can mutate choices, aligning with editorial review.【F:chd-qbank/schema.sql†L460-L461】

### `responses`
- **Insert:** Users may submit responses only for themselves.【F:chd-qbank/schema.sql†L463-L464】
- **Read:** Users can read their own responses; administrators can audit all history.【F:chd-qbank/schema.sql†L465-L466】
- **Update/Delete:** Users can change or remove only their own responses, preventing tampering with peers’ data.【F:chd-qbank/schema.sql†L467-L470】

### `answer_events`
- **Write:** This audit log is populated exclusively by the `log_answer_event` trigger, which runs as a security definer whenever a response is created or updated, preventing clients from fabricating history.【F:chd-qbank/schema.sql†L217-L239】
- **Read:** Administrators rely on analytics helper functions, such as `analytics_heatmap_admin()`, to fetch aggregated insights from the event stream without exposing raw rows to students.【F:chd-qbank/schema.sql†L386-L398】【F:chd-qbank/schema.sql†L984-L1059】
- **Effect:** Centralizing writes and reads through privileged helpers keeps the event ledger tamper-resistant while maintaining a single source of truth for analytics refreshes.

### Analytics tables (`item_stats`, `distractor_stats`, `assessment_reliability`)
- **Read:** World-readable to simplify in-app analytics for authenticated users.【F:chd-qbank/schema.sql†L472-L483】
- **Write:** Restricted to administrators to prevent arbitrary stat manipulation.【F:chd-qbank/schema.sql†L474-L483】

### `leaderboard`
- **Read:** Administrators always have access. Users can see their own row and any public leaderboard entries when the feature toggle is enabled.【F:chd-qbank/schema.sql†L485-L489】
- **Write:** Only administrators may manage scores, while the `increment_points` function awards points with additional server-side validation.【F:chd-qbank/schema.sql†L491-L492】【F:chd-qbank/schema.sql†L1075-L1104】

### `public_aliases`
- **Read:** Mirrors leaderboard visibility—administrators, the owning user, and (when toggled on) the public leaderboard audience may read aliases.【F:chd-qbank/schema.sql†L494-L499】
- **Write:** Only administrators can change public aliases directly; normal alias updates flow through triggers on `app_users`.【F:chd-qbank/schema.sql†L500-L501】【F:chd-qbank/schema.sql†L588-L600】

### `murmur_*` practice tables
- **`murmur_items` & `murmur_options`:** Authenticated users may read published items and their options, while administrators can edit or preview drafts.【F:chd-qbank/schema.sql†L503-L519】
- **`murmur_attempts`:** Users can create and read only their own attempts; administrators can audit all attempts.【F:chd-qbank/schema.sql†L520-L525】

### `cxr_*` practice tables
- **`cxr_items` & `cxr_labels`:** Read access mirrors the murmur policies—students see only published content while administrators manage drafts.【F:chd-qbank/schema.sql†L527-L545】
- **`cxr_attempts`:** Users can submit and read their own attempts; administrators can oversee everything.【F:chd-qbank/schema.sql†L546-L549】

### `leaderboard_events`
- **Read/Write:** Only administrators may access the audit trail of leaderboard point sources, which contains sensitive operational metadata.【F:chd-qbank/schema.sql†L1061-L1073】

## Security-definer analytics functions
Several analytics entrypoints run as `SECURITY DEFINER` so clients can call them via RPC without needing direct table grants:
- `analytics_refresh_heatmap()` and `analytics_refresh_reliability()` refresh materialized views after validating that the caller is an administrator or using the service role, preventing students from forcing expensive refreshes.【F:chd-qbank/schema.sql†L950-L983】
- `analytics_heatmap_admin()` and `analytics_reliability_snapshot()` call `is_admin()` internally before returning aggregated analytics rows, letting staff review heatmaps and reliability snapshots without relaxing RLS on the underlying tables.【F:chd-qbank/schema.sql†L386-L398】【F:chd-qbank/schema.sql†L984-L1059】【F:chd-qbank/schema.sql†L925-L946】

By combining RLS with tightly scoped `SECURITY DEFINER` helpers, the schema allows routine analytics and administrative maintenance while preventing unauthorized users from bypassing policy checks or reading unpublished content.

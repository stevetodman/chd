# Service worker operations

The production build registers [`src/service-worker.ts`](../../chd-qbank/src/service-worker.ts) to provide an offline-friendly experience. The worker is generated from TypeScript and bundled with Workbox helpers so we get consistent cache strategies and production safety checks. This runbook explains cache strategy, update behavior, and manual validation steps for operators.

## Caching strategy

- **App shell cache** – During `install` the worker seeds `/`, `/index.html`, `/offline.html`, and `/manifest.json` into a versioned cache whose suffix matches the current build hash. Previous versions are deleted during `activate`.
- **Static assets** – Same-origin CSS, JavaScript, fonts, and images use a stale-while-revalidate strategy backed by Workbox so returning visitors receive cached assets immediately while the worker refreshes them in the background.
- **Supabase REST requests** – GETs against `*.supabase.co/rest/v1/` use Workbox’s `NetworkFirst` strategy with a five-minute cache. This keeps dashboards responsive during transient outages without serving stale data indefinitely.
- **Supabase Storage objects** – Public storage assets (`/storage/v1/object/public/`) use `CacheFirst` with daily expiration, reducing bandwidth while respecting content updates.
- **Navigation handling** – Navigations prefer the network, refresh the cached `index.html` opportunistically, and fall back to `/offline.html` when both network and cache miss.

## Update experience

When a new deployment ships, the updated worker installs in the background. Once it reaches the `waiting` state the client displays a banner sourced from the React app: **“A new version is ready.”**

- Selecting **Reload** sends a `SKIP_WAITING` message, forcing activation and immediately refreshing the window.
- Dismissing the banner keeps the current session active; the next navigation or manual reload picks up the new caches automatically.

To test locally, run a production build (`npm run build`), serve it (`npm run preview`), and use DevTools → Application → Service Workers with “Update on reload” enabled.

## Offline fallback

Whenever `fetch` fails, the worker falls back to the cached shell. A minimal HTML offline page handles first-time visits before the cache is populated. To verify offline behavior:

1. Load the app normally to warm caches.
2. Disable the network (DevTools → Network → Offline).
3. Reload and confirm the interface still renders with cached data.
4. Restore connectivity and reload to clear the fallback state.

## Operational tips

- Cache keys derive from the build hash embedded at compile time; if you change caching rules locally, run a production build so the hash updates before testing.
- After deploying, confirm the update banner appears and that reloading switches to the new build without manual cache clearing.
- If users report stale assets, instruct them to reload when the banner appears or to perform a hard refresh (`Cmd/Ctrl + Shift + R`).
- Review Cloud or Supabase logs for `[Service Worker]` entries if you need to audit cache purges (`logCacheUsage()` runs during activation).

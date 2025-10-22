# Service worker operations

The production build registers [`src/service-worker.ts`](../../chd-qbank/src/service-worker.ts) to provide an offline-friendly experience. This runbook explains cache strategy, update behavior, and manual validation steps for operators.

## Caching strategy

- **App shell cache** – During the `install` event the worker seeds `/`, `/index.html`, and `/manifest.json` into a versioned cache (`app-shell-v1`).
- **Runtime cache** – Subsequent `GET` requests for same-origin CSS, JavaScript, fonts, and images are cached on first use to accelerate future navigations.
- **Navigation handling** – Navigations prefer the network, refreshing the cached `index.html` opportunistically. If the network is unavailable the worker serves the cached shell, and when nothing is cached yet it returns a minimal offline page instead of a generic browser error.

## Update experience

When a new deployment ships, the updated worker installs in the background. Once it reaches the `waiting` state the client displays a banner: **“A new version is ready.”**

- Selecting **Reload** calls `skipWaiting()` on the new worker, activates it immediately, and refreshes the page.
- Dismissing the banner keeps the current session active; the new worker takes over during the next navigation or manual reload.

To test locally, run a production build (`npm run build`), serve it (`npm run preview`), and use DevTools → Application → Service Workers with “Update on reload” enabled.

## Offline fallback

Whenever `fetch` fails, the worker falls back to the cached shell. A plain-text “Offline” response exists only for first-time visits before the cache is populated. To verify offline behavior:

1. Load the app normally to warm caches.
2. Disable the network (DevTools → Network → Offline).
3. Reload and confirm the interface still renders with cached data.
4. Restore connectivity and reload to clear the fallback state.

## Operational tips

- Bump the cache version string in `service-worker.ts` whenever caching rules change.
- After deploying, confirm the update banner appears and that reloading switches to the new build without manual cache clearing.
- If users report stale assets, instruct them to reload when the banner appears or to perform a hard refresh (`Cmd/Ctrl + Shift + R`).

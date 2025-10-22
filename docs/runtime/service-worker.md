# Service Worker Operations

The web client registers `src/service-worker.ts` in production builds to provide an offline-first experience. This document captures the behaviors operators should understand when shipping new releases or triaging cache issues.

## Caching strategy

- **App shell cache** – During the `install` event the worker seeds `/`, `/index.html`, and `/manifest.json` into a versioned cache bucket (`app-shell-v1`).
- **Runtime cache** – Subsequent `GET` requests for same-origin CSS, JavaScript, fonts, and images are cached on first use so future navigations are instant even on slow networks.
- **Navigation handling** – Regular navigations fetch from the network and then refresh the cached `index.html`. If the network is unavailable the worker falls back to the cached shell and, if nothing is cached yet, returns a minimal offline page instead of a browser error.

See [`chd-qbank/src/service-worker.ts`](../../chd-qbank/src/service-worker.ts) for implementation details.

## Update experience

When Vercel (or another static host) serves an updated build, the new worker installs in the background. Once it reaches the `waiting` state the client displays a banner announcing **“A new version is ready.”**

- Clicking **Reload** calls `skipWaiting()` on the updated worker and refreshes the page immediately so everyone runs the latest bundle.
- Dismissing the banner keeps the current session active; the new worker becomes active the next time the user navigates or reloads manually.

To verify the flow locally, run a production build, open DevTools → Application → Service Workers, and toggle “Update on reload” while watching for the banner.

## Offline fallback

The worker prefers the cached shell any time `fetch` throws. The plain-text 503 response (“Offline”) exists only as a last resort during a user’s very first visit.

For manual QA, disconnect your network, reload the app, and confirm the interface still renders with cached data. Restore connectivity and reload once more to clear the fallback state.

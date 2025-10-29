# SPA Router Fallback Micro Test Plan

1. Open the deployed site in a fresh browser session, then direct-navigate to `/foo/bar/baz`; confirm the app shell loads without a 404 and expected global UI (header/footer) render, indicating the route fell back to `index.html`.
2. With the app loaded on `/foo/bar/baz`, refresh the page; verify the reload preserves the SPA experience (no 404, initial loading spinner or shell appears) and client-side routing completes after hydration.
3. Repeat direct navigation to `/alpha/beta/gamma`; ensure the request resolves to the SPA entry point (network panel shows `index.html` with 200 status) and in-app not-found messaging handles the fake route.
4. Refresh on `/alpha/beta/gamma`; confirm the browser history retains the route, the app rehydrates correctly, and no server-generated 404 page appears.
5. Direct-navigate to `/one/two/three`; verify navigation lands on the SPA shell, network tab again shows a 200 response for `index.html`, and any client-side 404 component renders as designed.
6. Refresh on `/one/two/three`; ensure the rewritten response stays 200, the SPA bootstraps without error, and the client-side router remains functional for subsequent internal navigation.

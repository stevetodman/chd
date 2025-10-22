/* eslint-env serviceworker */
/// <reference lib="webworker" />

// PWA scaffold (disabled by default). Register via Vite plugin when ready.

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  // no-op
});

self.addEventListener("fetch", () => {
  // runtime caching can be implemented here.
});

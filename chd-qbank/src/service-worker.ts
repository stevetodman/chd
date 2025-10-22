/* eslint-env serviceworker */
/// <reference lib="webworker" />

// Offline-first service worker with runtime caching for core assets.

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const APP_SHELL_ASSETS = ["/", "/index.html", "/manifest.json"];
const STATIC_ASSET_PATTERN = /\.(?:css|js|woff2?|png|jpg|jpeg|svg|gif|webp|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const expectedCaches = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (!expectedCaches.has(cacheName)) {
              return caches.delete(cacheName);
            }
            return Promise.resolve(true);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  void cache.put(request, networkResponse.clone());
  return networkResponse;
}

async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    void cache.put("/index.html", networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cachedResponse = await cache.match("/index.html");

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" }
    });
  }
}

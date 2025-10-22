const CACHE_VERSION = "v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const QUESTION_CACHE = `questions-${CACHE_VERSION}`;
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("static-") || key.startsWith("questions-"))
            .filter((key) => key !== STATIC_CACHE && key !== QUESTION_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (STATIC_ASSETS.includes(url.pathname)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }

    if (request.destination === "document" || request.destination === "script" || request.destination === "style") {
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
      return;
    }
  }

  if (url.hostname.endsWith("supabase.co") && url.pathname.includes("/rest/v1/questions")) {
    event.respondWith(networkFirst(request, QUESTION_CACHE));
  }
});

function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, copy));
      return response;
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => cached);

    return cached || fetchPromise;
  });
}

function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      const copy = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, copy));
      return response;
    })
    .catch(() => caches.match(request));
}

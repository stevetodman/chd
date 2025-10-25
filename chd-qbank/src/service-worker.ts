/* eslint-env serviceworker */
/// <reference lib="webworker" />

import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;
declare const __BUILD_HASH__: string;

type ServiceWorkerClientMessage = {
  type?: string;
  version?: string;
};

type SkipWaitingMessage = {
  type: "SKIP_WAITING";
};

type LogoutMessage = {
  type: "LOGOUT";
};

const BUILD_HASH = typeof __BUILD_HASH__ === "string" ? __BUILD_HASH__ : "dev";
const APP_SHELL_CACHE = `app-shell-v${BUILD_HASH}`;
const STATIC_CACHE = `static-v${BUILD_HASH}`;
const DYNAMIC_CACHE = `dynamic-v${BUILD_HASH}`;
const SUPABASE_REST_CACHE = `supabase-rest-v${BUILD_HASH}`;
const SUPABASE_STORAGE_CACHE = `supabase-storage-v${BUILD_HASH}`;
const EXPECTED_CACHES = new Set([
  APP_SHELL_CACHE,
  STATIC_CACHE,
  DYNAMIC_CACHE,
  SUPABASE_REST_CACHE,
  SUPABASE_STORAGE_CACHE
]);
const APP_SHELL_ASSETS = ["/", "/index.html", "/offline.html", "/manifest.json"];
const STATIC_ASSET_PATTERN = /\.(?:css|js|woff2?|png|jpg|jpeg|svg|gif|webp|ico)$/i;
const SUPABASE_HOST_SUFFIX = ".supabase.co";

registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.hostname.endsWith(SUPABASE_HOST_SUFFIX) &&
    url.pathname.startsWith("/rest/v1/"),
  new NetworkFirst({
    cacheName: SUPABASE_REST_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 })
    ]
  })
);

registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.hostname.endsWith(SUPABASE_HOST_SUFFIX) &&
    url.pathname.startsWith("/storage/v1/object/public/"),
  new CacheFirst({
    cacheName: SUPABASE_STORAGE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const hadPreviousCache = cacheNames.some(
        (name) => name.startsWith("app-shell-v") && name !== APP_SHELL_CACHE
      );

      await Promise.all(
        cacheNames.map((cacheName) => {
          if (!EXPECTED_CACHES.has(cacheName)) {
            return caches.delete(cacheName);
          }
          return Promise.resolve(true);
        })
      );

      await logCacheUsage();

      if (hadPreviousCache) {
        await notifyClientsAboutUpdate();
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isApiRequest(request)) {
    event.respondWith(networkFirst(request));
  }
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as
    | SkipWaitingMessage
    | LogoutMessage
    | ServiceWorkerClientMessage
    | undefined;

  if (!data) {
    return;
  }

  if (data.type === "SKIP_WAITING") {
    event.waitUntil(
      (async () => {
        await self.skipWaiting();
        await self.clients.claim();
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });

        for (const client of clients) {
          client.postMessage({ type: "UPDATED", version: BUILD_HASH });
        }
      })()
    );
    return;
  }

  if (data.type === "LOGOUT") {
    event.waitUntil(clearDynamicCache());
  }
});

function isApiRequest(request: Request): boolean {
  const acceptHeader = request.headers.get("accept") ?? "";
  return acceptHeader.includes("application/json");
}

async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      void cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    void fetchPromise;
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;

  if (networkResponse) {
    return networkResponse;
  }

  return new Response("Service Unavailable", {
    status: 503,
    statusText: "Service Unavailable"
  });
}

async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      void cache.put("/index.html", response.clone());
    }

    return response;
  } catch (error) {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cachedResponse = await cache.match("/index.html");

    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await cache.match("/offline.html");

    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" }
    });
  }
}

async function notifyClientsAboutUpdate(): Promise<void> {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clients) {
    client.postMessage({ type: "UPDATE_READY", version: BUILD_HASH });
  }
}

async function logCacheUsage(): Promise<void> {
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    console.info(`[Service Worker] Cache ${cacheName}: ${keys.length} entries`);
  }
}

async function clearDynamicCache(): Promise<void> {
  const deleted = await caches.delete(DYNAMIC_CACHE);

  if (deleted) {
    console.info(`[Service Worker] Cleared cache ${DYNAMIC_CACHE} after logout`);
  }
}

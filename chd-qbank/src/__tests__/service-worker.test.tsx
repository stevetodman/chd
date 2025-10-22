import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import ServiceWorkerReloadPrompt from "../components/ServiceWorkerReloadPrompt";
import {
  UPDATE_READY,
  __resetServiceWorkerForTests,
  setupServiceWorkerListeners,
  useServiceWorkerStore
} from "../lib/serviceWorkerClient";
import { __TESTING__ } from "../service-worker";

interface CacheStorageStub {
  open: (cacheName: string) => Promise<Cache>;
}

declare global {
  // eslint-disable-next-line no-var
  var caches: CacheStorageStub | undefined;
}

describe("service worker caching strategies", () => {
  const originalFetch = global.fetch;
  const originalCaches = global.caches;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.caches = originalCaches;
  });

  it("serves cached static assets with stale-while-revalidate", async () => {
    const cachedResponse = new Response("cached");
    const networkResponse = new Response("network", { status: 200 });
    const cache = {
      match: vi.fn().mockResolvedValue(cachedResponse),
      put: vi.fn()
    } as unknown as Cache;
    const openMock = vi.fn().mockResolvedValue(cache);
    global.caches = { open: openMock } as CacheStorageStub;
    global.fetch = vi.fn().mockResolvedValue(networkResponse) as typeof fetch;

    const waitUntil = vi.fn();
    const request = new Request("https://example.com/main.js");

    const response = await __TESTING__.staleWhileRevalidate(request, {
      waitUntil
    } as unknown as FetchEvent);

    expect(response).toBe(cachedResponse);
    expect(openMock).toHaveBeenCalledWith(__TESTING__.RUNTIME_CACHE);
    expect(global.fetch).toHaveBeenCalledWith(request);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(cache.put).toHaveBeenCalledTimes(1));
  });

  it("falls back to cache when network fails for API requests", async () => {
    const cachedResponse = new Response(JSON.stringify({ value: 1 }), {
      headers: { "Content-Type": "application/json" }
    });
    const cache = {
      match: vi.fn().mockResolvedValue(cachedResponse),
      put: vi.fn()
    } as unknown as Cache;
    const openMock = vi.fn().mockResolvedValue(cache);
    global.caches = { open: openMock } as CacheStorageStub;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 2 }), { status: 200 }))
      .mockRejectedValueOnce(new Error("offline"));
    global.fetch = fetchMock as typeof fetch;

    const request = new Request("https://example.com/api/data");

    const networkResponse = await __TESTING__.networkFirst(request);
    expect(networkResponse.status).toBe(200);
    expect(cache.put).toHaveBeenCalledTimes(1);

    const fallbackResponse = await __TESTING__.networkFirst(request);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fallbackResponse).toBe(cachedResponse);
  });

  it("returns the offline page when navigation requests fail", async () => {
    const offlineResponse = new Response("<html>offline</html>", {
      headers: { "Content-Type": "text/html" }
    });
    const cache = {
      match: vi.fn().mockImplementation(async (key: RequestInfo | URL) => {
        if (key === "/offline.html") {
          return offlineResponse;
        }
        return null;
      }),
      put: vi.fn()
    } as unknown as Cache;
    const openMock = vi.fn().mockResolvedValue(cache);
    global.caches = { open: openMock } as CacheStorageStub;
    global.fetch = vi.fn().mockRejectedValue(new Error("offline")) as typeof fetch;

    const response = await __TESTING__.handleNavigationRequest(new Request("https://example.com/dashboard"));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await expect(response.text()).resolves.toContain("offline");
  });
});

describe("service worker update prompt", () => {
  beforeEach(() => {
    __resetServiceWorkerForTests();
    useServiceWorkerStore.setState({ status: "IDLE", registration: null });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it("renders the reload prompt when UPDATE_READY is received", async () => {
    const waitingWorker = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const registration = {
      waiting: waitingWorker
    } as unknown as ServiceWorkerRegistration;

    const serviceWorker = Object.assign(new EventTarget(), {
      getRegistration: vi.fn().mockResolvedValue(registration)
    }) as unknown as ServiceWorkerContainer;

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: serviceWorker
    });

    setupServiceWorkerListeners(serviceWorker);

    render(<ServiceWorkerReloadPrompt />);

    act(() => {
      serviceWorker.dispatchEvent(new MessageEvent("message", { data: { type: UPDATE_READY } }));
    });

    expect(await screen.findByTestId("service-worker-update-prompt")).toBeInTheDocument();
  });
});

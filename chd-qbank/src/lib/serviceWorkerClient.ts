import { create } from "zustand";

export const UPDATE_READY = "UPDATE_READY" as const;

type ServiceWorkerStatus = "IDLE" | typeof UPDATE_READY;

interface ServiceWorkerState {
  status: ServiceWorkerStatus;
  registration: ServiceWorkerRegistration | null;
  setUpdateReady: (registration: ServiceWorkerRegistration) => void;
  reset: () => void;
}

export const useServiceWorkerStore = create<ServiceWorkerState>((set) => ({
  status: "IDLE",
  registration: null,
  setUpdateReady: (registration) => set({ status: UPDATE_READY, registration }),
  reset: () => set({ status: "IDLE", registration: null })
}));

export function notifyUpdateReady(registration: ServiceWorkerRegistration) {
  useServiceWorkerStore.getState().setUpdateReady(registration);
}

export function dismissUpdatePrompt() {
  useServiceWorkerStore.getState().reset();
}

export function applyServiceWorkerUpdate() {
  const { registration } = useServiceWorkerStore.getState();
  registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
}

let listenersInitialized = false;

export function setupServiceWorkerListeners(container: ServiceWorkerContainer) {
  if (listenersInitialized) return;
  listenersInitialized = true;

  container.addEventListener("message", async (event: MessageEvent) => {
    if (event.data?.type !== UPDATE_READY) return;
    const registration = await container.getRegistration();
    if (registration) {
      notifyUpdateReady(registration);
    }
  });

  let refreshing = false;
  container.addEventListener("controllerchange", () => {
    useServiceWorkerStore.getState().reset();
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    return;
  }

  const container = navigator.serviceWorker;
  setupServiceWorkerListeners(container);

  try {
    const registrationUrl = new URL("../service-worker.ts", import.meta.url);
    const registration = await container.register(registrationUrl, { type: "module" });

    if (registration.waiting && container.controller) {
      notifyUpdateReady(registration);
    }

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && registration.waiting && container.controller) {
          notifyUpdateReady(registration);
        }
      });
    });
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}

export function __resetServiceWorkerForTests() {
  listenersInitialized = false;
  useServiceWorkerStore.getState().reset();
}

import { useEffect, useRef, useState } from "react";

type UpdateReadyMessage = {
  type: "UPDATE_READY";
  version?: string;
};

type UpdatedMessage = {
  type: "UPDATED";
  version?: string;
};

type ServiceWorkerEventMessage = UpdateReadyMessage | UpdatedMessage | { type?: string };

export function useServiceWorkerUpdates() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const shouldReloadRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;

    const reloadIfNeeded = () => {
      if (!shouldReloadRef.current) {
        return;
      }

      shouldReloadRef.current = false;
      window.location.reload();
    };

    const handleMessage = (event: MessageEvent<ServiceWorkerEventMessage>) => {
      const data = event.data;

      if (!data || typeof data.type !== "string") {
        return;
      }

      if (data.type === "UPDATE_READY") {
        const updateData = data as UpdateReadyMessage;
        if (!isMounted) return;
        setUpdateVersion(updateData.version ?? "latest");
        void navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration?.waiting) {
            waitingWorkerRef.current = registration.waiting;
          }
        });
      }

      if (data.type === "UPDATED") {
        reloadIfNeeded();
      }
    };

    const handleControllerChange = () => {
      reloadIfNeeded();
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        waitingWorkerRef.current = registration.waiting;
      }
    });

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const dismissUpdate = () => {
    setUpdateVersion(null);
  };

  const confirmUpdate = () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    shouldReloadRef.current = true;
    setUpdateVersion(null);

    const postSkipWaiting = (worker: ServiceWorker | null | undefined) => {
      worker?.postMessage({ type: "SKIP_WAITING" });
      waitingWorkerRef.current = null;
    };

    if (waitingWorkerRef.current) {
      postSkipWaiting(waitingWorkerRef.current);
      return;
    }

    void navigator.serviceWorker.getRegistration().then((registration) => {
      postSkipWaiting(registration?.waiting ?? null);
    });
  };

  return {
    updateVersion,
    confirmUpdate,
    dismissUpdate
  };
}

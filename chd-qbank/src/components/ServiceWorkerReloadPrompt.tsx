import { useCallback } from "react";
import { applyServiceWorkerUpdate, dismissUpdatePrompt, UPDATE_READY, useServiceWorkerStore } from "../lib/serviceWorkerClient";
import { Button } from "./ui/Button";

export default function ServiceWorkerReloadPrompt() {
  const status = useServiceWorkerStore((state) => state.status);

  const handleReload = useCallback(() => {
    applyServiceWorkerUpdate();
  }, []);

  const handleDismiss = useCallback(() => {
    dismissUpdatePrompt();
  }, []);

  if (status !== UPDATE_READY) {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-brand-900 text-white px-4 py-3 flex flex-col gap-3 rounded-md shadow-lg border border-brand-700"
      data-testid="service-worker-update-prompt"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">A new version of CHD Qbank is available.</p>
        <p className="text-sm text-brand-100">Reload now to update your app.</p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={handleDismiss}>
          Not now
        </Button>
        <Button onClick={handleReload}>Reload</Button>
      </div>
    </div>
  );
}

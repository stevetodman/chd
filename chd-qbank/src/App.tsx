import { Suspense, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppRoutes } from "./routes";
import { getSession, useSessionStore } from "./lib/auth";
import { useServiceWorkerUpdates } from "./hooks/useServiceWorkerUpdates";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading, initialized } = useSessionStore();
  const { updateVersion, confirmUpdate, dismissUpdate } = useServiceWorkerUpdates();

  useEffect(() => {
    void getSession();
  }, []);

  useEffect(() => {
    if (loading || !initialized) return;
    const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup";
    if (!session && !isAuthRoute) {
      navigate("/login", { replace: true });
    }
  }, [session, loading, initialized, location.pathname, navigate]);

  return (
    <>
      <Suspense fallback={<div className="p-6">Loading…</div>}>
        <AppRoutes />
      </Suspense>
      {updateVersion && (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg bg-neutral-900 px-4 py-3 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">
              <p className="font-semibold">A new version is ready.</p>
              <p className="text-neutral-300">Version {updateVersion}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmUpdate}
                className="rounded bg-white px-3 py-1 text-sm font-medium text-neutral-900 shadow"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                className="text-sm text-neutral-300 underline-offset-2 hover:underline"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

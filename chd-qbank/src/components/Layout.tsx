import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useSettingsStore } from "../lib/settings";
import { useSessionStore } from "../lib/auth";
import { requireAdmin, signOut } from "../lib/auth";
import { Button } from "./ui/Button";

export default function Layout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const maintenanceMode = useSettingsStore((s) => s.maintenanceMode);
  const { session, loading: sessionLoading, initialized } = useSessionStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdminFor, setCheckedAdminFor] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading || !initialized || !session) {
      return;
    }
    void loadSettings();
  }, [loadSettings, session, sessionLoading, initialized]);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setCheckedAdminFor(null);
      return;
    }

    if (checkedAdminFor === session.user.id) {
      return;
    }

    let cancelled = false;

    requireAdmin()
      .then((ok) => {
        if (cancelled) return;
        setIsAdmin(ok);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAdmin(false);
      })
      .finally(() => {
        if (cancelled) return;
        setCheckedAdminFor(session.user.id);
      });

    return () => {
      cancelled = true;
    };
  }, [session, checkedAdminFor]);

  const showMaintenance = !!session && maintenanceMode && !isAdmin;

  return (
    <div className="relative min-h-screen bg-neutral-50">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 -translate-y-32 transform rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6" tabIndex={-1}>
        {showMaintenance ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-lg rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
              <h1 className="text-xl font-semibold">We&rsquo;re doing a quick tune-up</h1>
              <p className="mt-2 text-neutral-600">
                The app is temporarily unavailable for students while we update things.
                Please check back soon.
              </p>
              <div className="mt-4 flex justify-center">
                <Button onClick={() => { void signOut(); }}>Sign out</Button>
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </div>
  );
}

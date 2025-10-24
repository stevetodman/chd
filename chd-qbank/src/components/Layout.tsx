import { useEffect, useState } from "react";
import classNames from "classnames";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useSettingsStore } from "../lib/settings";
import { useSessionStore } from "../lib/auth";
import { requireAdmin, signOut } from "../lib/auth";
import { Button } from "./ui/Button";
import { useFeatureFlagsStore } from "../store/featureFlags";

export default function Layout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const maintenanceMode = useSettingsStore((s) => s.maintenanceMode);
  const { session, loading: sessionLoading, initialized } = useSessionStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdminFor, setCheckedAdminFor] = useState<string | null>(null);
  const darkModeEnabled = useFeatureFlagsStore((state) => state.darkModeEnabled);

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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", darkModeEnabled);
    root.style.colorScheme = darkModeEnabled ? "dark" : "light";
    return () => {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    };
  }, [darkModeEnabled]);

  const containerClasses = classNames(
    "min-h-screen transition-colors",
    darkModeEnabled ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
  );

  return (
    <div className={containerClasses}>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
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

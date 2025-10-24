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
    <div className="relative min-h-screen bg-slate-950 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.85),_rgba(15,23,42,1))]" />
      <div className="relative flex min-h-screen flex-col">
        <Navbar />
        <main className="relative z-10 flex-1 px-4 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto w-full max-w-7xl">
            <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/90 p-6 shadow-2xl backdrop-blur-sm sm:p-10">
              <div className="pointer-events-none absolute inset-0 -z-10 opacity-80 [background:radial-gradient(120%_120%_at_0%_0%,rgba(37,99,235,0.12),transparent),radial-gradient(80%_120%_at_100%_0%,rgba(59,130,246,0.08),transparent)]" />
              <div className="relative text-neutral-900">
                {showMaintenance ? (
                  <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="max-w-lg space-y-4 rounded-3xl border border-neutral-200/70 bg-white/90 p-8 text-center shadow-xl">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <svg
                          aria-hidden="true"
                          className="h-6 w-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 21h-6" />
                          <path d="M3 21h6" />
                          <path d="M9 7h6" />
                          <path d="M12 3v4" />
                          <path d="m5 21 5-14 3 8 4-6 2 6" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-neutral-900">We&apos;re doing a quick tune-up</h1>
                        <p className="text-sm leading-6 text-neutral-600">
                          The app is temporarily unavailable for students while we update things. Please check back soon or sign
                          out to switch accounts.
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <Button onClick={() => { void signOut(); }}>Sign out</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Outlet />
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

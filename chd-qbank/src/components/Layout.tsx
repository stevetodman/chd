import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useSettingsStore } from "../lib/settings";
import { useSessionStore } from "../lib/auth";
import { requireAdmin, signOut } from "../lib/auth";
import { Button } from "./ui/Button";

export default function Layout() {
  const location = useLocation();
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const maintenanceMode = useSettingsStore((s) => s.maintenanceMode);
  const { session, loading: sessionLoading, initialized } = useSessionStore();
  const [adminInfo, setAdminInfo] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (sessionLoading || !initialized || !session) {
      return;
    }
    void loadSettings();
  }, [loadSettings, session, sessionLoading, initialized]);

  useEffect(() => {
    const sessionId = session?.user.id;
    if (!sessionId) {
      return;
    }

    if (adminInfo?.userId === sessionId) {
      return;
    }

    let cancelled = false;

    requireAdmin()
      .then((ok) => {
        if (cancelled) return;
        setAdminInfo({ userId: sessionId, isAdmin: ok });
      })
      .catch(() => {
        if (cancelled) return;
        setAdminInfo({ userId: sessionId, isAdmin: false });
      });

    return () => {
      cancelled = true;
    };
  }, [session, adminInfo?.userId]);

  const checkingAdmin = !!session && adminInfo?.userId !== session.user.id;
  const isAdmin = session ? (adminInfo?.userId === session.user.id ? adminInfo.isAdmin : false) : false;
  const showMaintenance = !!session && maintenanceMode && !isAdmin && !checkingAdmin;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div key={`${location.pathname}${location.search}`} className="page-transition">
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
        </div>
      </main>
      <Footer />
    </div>
  );
}

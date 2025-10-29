import { useEffect, useReducer } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useSettingsStore } from "../lib/settings";
import { useSessionStore } from "../lib/auth";
import { requireAdmin, signOut } from "../lib/auth";
import { Button } from "./ui/Button";

type AdminState = {
  isAdmin: boolean;
  checkedAdminFor: string | null;
};

type AdminAction =
  | { type: "reset" }
  | { type: "checked"; userId: string; isAdmin: boolean };

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
  switch (action.type) {
    case "reset":
      return { isAdmin: false, checkedAdminFor: null };
    case "checked":
      return { isAdmin: action.isAdmin, checkedAdminFor: action.userId };
    default:
      return state;
  }
};

export default function Layout() {
  const location = useLocation();
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const maintenanceMode = useSettingsStore((s) => s.maintenanceMode);
  const { session, loading: sessionLoading, initialized } = useSessionStore();
  const [{ isAdmin, checkedAdminFor }, dispatch] = useReducer(adminReducer, {
    isAdmin: false,
    checkedAdminFor: null
  });

  useEffect(() => {
    if (sessionLoading || !initialized || !session) {
      return;
    }
    void loadSettings();
  }, [loadSettings, session, sessionLoading, initialized]);

  useEffect(() => {
    if (!session) {
      dispatch({ type: "reset" });
      return;
    }

    if (checkedAdminFor === session.user.id) {
      return;
    }

    let cancelled = false;

    requireAdmin()
      .then((ok) => {
        if (cancelled) return;
        dispatch({ type: "checked", userId: session.user.id, isAdmin: ok });
      })
      .catch(() => {
        if (cancelled) return;
        dispatch({ type: "checked", userId: session.user.id, isAdmin: false });
      });

    return () => {
      cancelled = true;
    };
  }, [session, checkedAdminFor]);

  const checkingAdmin = !!session && checkedAdminFor !== session?.user.id;
  const showMaintenance =
    !!session && maintenanceMode && !isAdmin && !checkingAdmin;

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

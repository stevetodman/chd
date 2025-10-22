import { lazy, useEffect, useState } from "react";
import { useRoutes, Navigate } from "react-router-dom";
import { requireAdmin, useSessionStore } from "./lib/auth";
import Layout from "./components/Layout";
import { useSettingsStore } from "./lib/settings";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Practice = lazy(() => import("./pages/Practice"));
const Review = lazy(() => import("./pages/Review"));
const Murmurs = lazy(() => import("./pages/Games/Murmurs"));
const CxrMatch = lazy(() => import("./pages/Games/CxrMatch"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AliasSettings = lazy(() => import("./pages/Profile/AliasSettings"));
const Items = lazy(() => import("./pages/Admin/Items"));
const ItemEditor = lazy(() => import("./pages/Admin/ItemEditor"));
const Importer = lazy(() => import("./pages/Admin/Importer"));
const Analytics = lazy(() => import("./pages/Admin/Analytics"));
const Settings = lazy(() => import("./pages/Admin/Settings"));

function LeaderboardGuard() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const leaderboardEnabled = useSettingsStore((state) => state.leaderboardEnabled);
  const settingsLoading = useSettingsStore((state) => state.loading);
  const settingsLoaded = useSettingsStore((state) => state.loaded);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (settingsLoading || !settingsLoaded) return <div className="p-6 text-center">Loading…</div>;
  if (!leaderboardEnabled) return <Navigate to="/dashboard" replace />;
  return <Leaderboard />;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useSessionStore();
  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { session, loading } = useSessionStore();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAllowed(null);
    if (!session) return;
    requireAdmin()
      .then((isAdmin) => setAllowed(isAdmin))
      .catch(() => setAllowed(false));
  }, [session]);

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allowed === null) return <div className="p-6 text-center">Checking permissions…</div>;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}

export function AppRoutes() {
  const routing = useRoutes([
    {
      element: <Layout />,
      children: [
        { path: "/login", element: <Login /> },
        { path: "/signup", element: <Signup /> },
        {
          path: "/",
          element: (
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          )
        },
        {
          path: "/dashboard",
          element: (
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          )
        },
        {
          path: "/practice",
          element: (
            <RequireAuth>
              <Practice />
            </RequireAuth>
          )
        },
        {
          path: "/review",
          element: (
            <RequireAuth>
              <Review />
            </RequireAuth>
          )
        },
        {
          path: "/games/murmurs",
          element: (
            <RequireAuth>
              <Murmurs />
            </RequireAuth>
          )
        },
        {
          path: "/games/cxr",
          element: (
            <RequireAuth>
              <CxrMatch />
            </RequireAuth>
          )
        },
        {
          path: "/leaderboard",
          element: (
            <RequireAuth>
              <LeaderboardGuard />
            </RequireAuth>
          )
        },
        {
          path: "/profile/alias",
          element: (
            <RequireAuth>
              <AliasSettings />
            </RequireAuth>
          )
        },
        {
          path: "/admin/items",
          element: (
            <RequireAdmin>
              <Items />
            </RequireAdmin>
          )
        },
        {
          path: "/admin/item/:id",
          element: (
            <RequireAdmin>
              <ItemEditor />
            </RequireAdmin>
          )
        },
        {
          path: "/admin/import",
          element: (
            <RequireAdmin>
              <Importer />
            </RequireAdmin>
          )
        },
        {
          path: "/admin/analytics",
          element: (
            <RequireAdmin>
              <Analytics />
            </RequireAdmin>
          )
        },
        {
          path: "/admin/settings",
          element: (
            <RequireAdmin>
              <Settings />
            </RequireAdmin>
          )
        }
      ]
    }
  ]);

  return routing;
}

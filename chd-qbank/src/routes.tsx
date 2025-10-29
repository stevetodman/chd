import { lazy, useEffect, useState } from "react";
import { useRoutes, Navigate } from "react-router-dom";
import { requireAdmin, useSessionStore } from "./lib/auth";
import Layout from "./components/Layout";
import PageState from "./components/PageState";
import { useSettingsStore } from "./lib/settings";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Practice = lazy(() => import("./pages/practice"));
const Review = lazy(() => import("./pages/Review"));
const GamesIndex = lazy(() => import("./pages/Games"));
const Murmurs = lazy(() => import("./pages/Games/Murmurs"));
const CxrMatch = lazy(() => import("./pages/Games/CxrMatch"));
const EkgInterpretation = lazy(() => import("./pages/Games/EkgInterpretation"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AliasSettings = lazy(() => import("./pages/Profile/AliasSettings"));
const Items = lazy(() => import("./pages/Admin/Items"));
const ItemEditor = lazy(() => import("./pages/Admin/ItemEditor"));
const Importer = lazy(() => import("./pages/Admin/Importer"));
const Analytics = lazy(() => import("./pages/Admin/Analytics"));
const Settings = lazy(() => import("./pages/Admin/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LeaderboardGuard() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const leaderboardEnabled = useSettingsStore((state) => state.leaderboardEnabled);
  const settingsLoading = useSettingsStore((state) => state.loading);
  const settingsLoaded = useSettingsStore((state) => state.loaded);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (settingsLoading || !settingsLoaded)
    return (
      <div className="p-6">
        <PageState
          title="Loading leaderboard"
          description="Give us a moment to confirm leaderboard availability."
          fullHeight
        />
      </div>
    );
  if (!leaderboardEnabled) return <Navigate to="/dashboard" replace />;
  return <Leaderboard />;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading, initialized } = useSessionStore();
  if (session) return children;
  if (loading || !initialized)
    return (
      <div className="p-6">
        <PageState title="Signing you in" description="Hold tight while we verify your account." fullHeight />
      </div>
    );
  return <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { session, loading, initialized } = useSessionStore();
  const [state, setState] = useState<{ status: "unknown" | "allowed" | "denied"; checkedFor: string | null }>(
    () => ({ status: "unknown", checkedFor: null })
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    if (state.checkedFor === session.user.id && state.status !== "unknown") {
      return;
    }

    let cancelled = false;

    requireAdmin()
      .then((isAdmin) => {
        if (cancelled) return;
        setState({ status: isAdmin ? "allowed" : "denied", checkedFor: session.user.id });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "denied", checkedFor: session.user.id });
      });

    return () => {
      cancelled = true;
    };
  }, [session, state.checkedFor, state.status]);

  const isChecking = !!session && (state.checkedFor !== session.user.id || state.status === "unknown");
  const isAllowed = state.status === "allowed" && state.checkedFor === session?.user.id;

  if (loading || !initialized)
    return (
      <div className="p-6">
        <PageState title="Checking permissions" description="Confirming your account access." fullHeight />
      </div>
    );
  if (!session) return <Navigate to="/login" replace />;
  if (isChecking)
    return (
      <div className="p-6">
        <PageState title="Checking permissions" description="Making sure you have admin access." fullHeight />
      </div>
    );
  if (!isAllowed) return <Navigate to="/dashboard" replace />;
  return children;
}

export function AppRoutes() {
  const routing = useRoutes([
    {
      element: <Layout />,
      children: [
        { path: "/login", element: <Login /> },
        { path: "/signup", element: <Signup /> },
        { path: "/reset-password", element: <ResetPassword /> },
        { path: "/privacy", element: <Privacy /> },
        { path: "/terms", element: <Terms /> },
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
          path: "/games/ekg",
          element: (
            <RequireAuth>
              <EkgInterpretation />
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
          path: "/games",
          element: (
            <RequireAuth>
              <GamesIndex />
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
        },
        { path: "*", element: <NotFound /> }
      ]
    }
  ]);

  return routing;
}

import { Suspense, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppRoutes } from "./routes";
import { getSession, useSessionStore } from "./lib/auth";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading, initialized } = useSessionStore();

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
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AppRoutes />
    </Suspense>
  );
}

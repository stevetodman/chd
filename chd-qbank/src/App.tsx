import { Suspense, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppRoutes } from "./routes";
import { getSession, useSessionStore } from "./lib/auth";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useSessionStore();

  useEffect(() => {
    getSession().catch(() => navigate("/login"));
  }, [navigate]);

  useEffect(() => {
    if (!session && location.pathname !== "/signup") {
      navigate("/login", { replace: true });
    }
  }, [session, location.pathname, navigate]);

  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AppRoutes />
    </Suspense>
  );
}

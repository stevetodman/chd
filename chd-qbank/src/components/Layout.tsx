import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ServiceWorkerReloadPrompt from "./ServiceWorkerReloadPrompt";
import { useSettingsStore } from "../lib/settings";
import { useSessionStore } from "../lib/auth";

export default function Layout() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const { session, loading: sessionLoading, initialized } = useSessionStore();

  useEffect(() => {
    if (sessionLoading || !initialized || !session) return;
    void loadSettings();
  }, [loadSettings, session, sessionLoading, initialized]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      <div className="px-4 pt-4 flex justify-center">
        <ServiceWorkerReloadPrompt />
      </div>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

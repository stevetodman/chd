import { supabase } from "./supabaseClient";
import { normalizeEmailAddress } from "./utils";
import { create } from "zustand";

interface SessionState {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: SessionState["session"]) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loading: true,
  initialized: false,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized })
}));

export async function signIn(email: string, password: string) {
  // Supabase email/password auth (RLS enforced on data tables).
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmailAddress(email), password });
  if (error) throw error;
  useSessionStore.getState().setSession(data.session);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  useSessionStore.getState().setSession(null);
  void notifyServiceWorkerAboutLogout();
}

export async function getSession() {
  const sessionStore = useSessionStore.getState();
  sessionStore.setLoading(true);
  try {
    const { data } = await supabase.auth.getSession();
    sessionStore.setSession(data.session);
    return data.session;
  } catch {
    return null;
  } finally {
    sessionStore.setLoading(false);
    sessionStore.setInitialized(true);
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("AUTH_REQUIRED");
  }
  return session;
}

export async function requireAdmin(): Promise<boolean> {
  const session = await requireAuth();
  const { data, error } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.role === "admin";
}

supabase.auth.onAuthStateChange((_event, session) => {
  const sessionStore = useSessionStore.getState();
  sessionStore.setSession(session);
  if (sessionStore.initialized) {
    sessionStore.setLoading(false);
  }
});

async function notifyServiceWorkerAboutLogout() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const targets = [
      navigator.serviceWorker.controller,
      registration?.active ?? null,
      registration?.waiting ?? null
    ];

    for (const worker of targets) {
      if (worker) {
        worker.postMessage({ type: "LOGOUT" });
      }
    }
  } catch (error) {
    console.warn("Failed to notify service worker about logout", error);
  }
}

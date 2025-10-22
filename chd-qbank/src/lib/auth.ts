import { supabase } from "./supabaseClient";
import { create } from "zustand";
import { logError } from "./telemetry";

interface SessionState {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
  loading: boolean;
  setSession: (session: SessionState["session"]) => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading })
}));

export async function signIn(email: string, password: string) {
  // Supabase email/password auth (RLS enforced on data tables).
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logError(error, { scope: "auth.signIn", email });
    throw error;
  }
  useSessionStore.getState().setSession(data.session);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  useSessionStore.getState().setSession(null);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  useSessionStore.getState().setSession(data.session);
  useSessionStore.getState().setLoading(false);
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const error = new Error("AUTH_REQUIRED");
    logError(error, { scope: "auth.requireAuth" });
    throw error;
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
  if (error) {
    logError(error, { scope: "auth.requireAdmin", userId: session.user.id });
    throw error;
  }
  return data?.role === "admin";
}

supabase.auth.onAuthStateChange((_event, session) => {
  useSessionStore.getState().setSession(session);
  useSessionStore.getState().setLoading(false);
});

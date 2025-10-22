import { supabase } from "./supabaseClient";
import { create } from "zustand";

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
  if (error) throw error;
  useSessionStore.getState().setSession(data.session);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  useSessionStore.getState().setSession(null);
}

export async function getSession() {
  try {
    const { data } = await supabase.auth.getSession();
    useSessionStore.getState().setSession(data.session);
    return data.session;
  } catch (error) {
    useSessionStore.getState().setSession(null);
    throw error;
  } finally {
    useSessionStore.getState().setLoading(false);
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
  useSessionStore.getState().setSession(session);
  useSessionStore.getState().setLoading(false);
});

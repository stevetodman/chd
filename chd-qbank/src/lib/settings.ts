import { create } from "zustand";
import { supabase } from "./supabaseClient";

interface SettingsState {
  leaderboardEnabled: boolean;
  loading: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setLeaderboardEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  leaderboardEnabled: false,
  loading: false,
  loaded: false,
  loadSettings: async () => {
    const { loading, loaded } = get();
    if (loading || loaded) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "leaderboard_enabled")
      .maybeSingle();

    if (error) {
      console.error("Failed to load app settings", error);
      set({ leaderboardEnabled: false, loading: false, loaded: true });
      return;
    }

    const enabled = data?.value !== "false";
    set({ leaderboardEnabled: enabled, loading: false, loaded: true });
  },
  setLeaderboardEnabled: (enabled: boolean) => set({ leaderboardEnabled: enabled, loaded: true })
}));

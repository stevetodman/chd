import { create } from "zustand";
import { supabase } from "./supabaseClient";

interface SettingsState {
  leaderboardEnabled: boolean;
  maintenanceMode: boolean;
  loading: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setLeaderboardEnabled: (enabled: boolean) => void;
  setMaintenanceMode: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  leaderboardEnabled: false,
  maintenanceMode: false,
  loading: false,
  loaded: false,
  loadSettings: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["leaderboard_enabled", "maintenance_mode"]);

      if (error) {
        console.error("Failed to load app settings", error);
        set({ leaderboardEnabled: false, maintenanceMode: false, loading: false, loaded: true });
        return;
      }

      const kv = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      const leaderboardEnabled = kv["leaderboard_enabled"] !== "false";
      const maintenanceMode = kv["maintenance_mode"] === "true";

      set({ leaderboardEnabled, maintenanceMode, loading: false, loaded: true });
    } catch (e) {
      console.error("Settings load error", e);
      set({ leaderboardEnabled: false, maintenanceMode: false, loading: false, loaded: true });
    }
  },
  setLeaderboardEnabled: (enabled: boolean) => set({ leaderboardEnabled: enabled, loaded: true }),
  setMaintenanceMode: (enabled: boolean) => set({ maintenanceMode: enabled, loaded: true })
}));

import { create } from "zustand";

const DARK_MODE_STORAGE_KEY = "chd:dark-mode";

const getStoredDarkMode = () => {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (stored === null) return false;
  return stored === "true";
};

type FeatureFlagsState = {
  tutorModeEnabled: boolean;
  darkModeEnabled: boolean;
  toggleTutorMode: () => void;
  toggleDarkMode: () => void;
};

export const useFeatureFlagsStore = create<FeatureFlagsState>((set) => ({
  tutorModeEnabled: true,
  darkModeEnabled: getStoredDarkMode(),
  toggleTutorMode: () => set((state) => ({ tutorModeEnabled: !state.tutorModeEnabled })),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkModeEnabled;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DARK_MODE_STORAGE_KEY, next ? "true" : "false");
      }
      return { darkModeEnabled: next };
    })
}));

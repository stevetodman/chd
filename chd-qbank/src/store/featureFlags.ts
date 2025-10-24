import { create } from "zustand";

type FeatureFlagsState = {
  tutorModeEnabled: boolean;
  darkModeEnabled: boolean;
  toggleTutorMode: () => void;
  toggleDarkMode: () => void;
};

export const useFeatureFlagsStore = create<FeatureFlagsState>((set) => ({
  tutorModeEnabled: true,
  darkModeEnabled: false,
  toggleTutorMode: () => set((state) => ({ tutorModeEnabled: !state.tutorModeEnabled })),
  toggleDarkMode: () => set((state) => ({ darkModeEnabled: !state.darkModeEnabled }))
}));

import { create } from "zustand";

type FeatureFlagsState = {
  tutorModeEnabled: boolean;
  darkModeEnabled: boolean;
  learningGamesEnabled: boolean;
  setTutorModeEnabled: (enabled: boolean) => void;
  toggleTutorMode: () => void;
  setDarkModeEnabled: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  setLearningGamesEnabled: (enabled: boolean) => void;
  toggleLearningGames: () => void;
};

export const useFeatureFlagsStore = create<FeatureFlagsState>((set) => ({
  tutorModeEnabled: true,
  darkModeEnabled: false,
  learningGamesEnabled: true,
  setTutorModeEnabled: (enabled: boolean) => set({ tutorModeEnabled: enabled }),
  toggleTutorMode: () => set((state) => ({ tutorModeEnabled: !state.tutorModeEnabled })),
  setDarkModeEnabled: (enabled: boolean) => set({ darkModeEnabled: enabled }),
  toggleDarkMode: () => set((state) => ({ darkModeEnabled: !state.darkModeEnabled })),
  setLearningGamesEnabled: (enabled: boolean) => set({ learningGamesEnabled: enabled }),
  toggleLearningGames: () => set((state) => ({ learningGamesEnabled: !state.learningGamesEnabled }))
}));

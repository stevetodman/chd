import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type FeatureFlagsState = {
  tutorModeEnabled: boolean;
  darkModeEnabled: boolean;
  toggleTutorMode: () => void;
  toggleDarkMode: () => void;
};

const defaultState: Pick<FeatureFlagsState, "tutorModeEnabled" | "darkModeEnabled"> = {
  tutorModeEnabled: true,
  darkModeEnabled: false
};

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      ...defaultState,
      toggleTutorMode: () => set((state) => ({ tutorModeEnabled: !state.tutorModeEnabled })),
      toggleDarkMode: () => set((state) => ({ darkModeEnabled: !state.darkModeEnabled }))
    }),
    {
      name: "feature-flags",
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => window.localStorage)
          : undefined
    }
  )
);

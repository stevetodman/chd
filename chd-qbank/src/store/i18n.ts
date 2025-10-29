import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

export interface LocaleState {
  locale: string;
  setLocale: (locale: string) => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

const storage = createJSONStorage<{ locale: string }>(() => {
  if (typeof window === "undefined") {
    return noopStorage;
  }
  return window.localStorage;
});

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale })
    }),
    {
      name: "chd-locale",
      version: 1,
      storage,
      partialize: (state) => ({ locale: state.locale })
    }
  )
);

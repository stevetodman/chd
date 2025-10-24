import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface LocaleState {
  locale: string;
  setLocale: (locale: string) => void;
}

const storage = createJSONStorage<LocaleState>(() => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage;
});

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'chd-locale',
      version: 1,
      storage,
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);

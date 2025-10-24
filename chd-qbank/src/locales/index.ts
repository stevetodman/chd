import en from './en.json';
import es from './es.json';

export const messages = {
  en,
  es,
};

export type LocaleOption = {
  code: keyof typeof messages;
  label: string;
};

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export const FALLBACK_LOCALE: LocaleOption['code'] = 'en';

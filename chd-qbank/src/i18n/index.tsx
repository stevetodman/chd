import { createContext, useContext, useMemo, type ReactNode } from "react";
import enMessages from "./locales/en.json";
import { formatIcu } from "./icu";
import type { MessageDescriptor, Messages } from "./types";

export type MessageValues = Record<string, unknown>;

type I18nContextValue = {
  locale: string;
  messages: Messages;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatUnit: (value: number, unit: Intl.NumberFormatOptions["unit"], options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const DEFAULT_MESSAGES: Messages = enMessages as Messages;

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE] as const;

const MESSAGE_CATALOG: Record<string, Messages> = {
  en: DEFAULT_MESSAGES
};

function normalizeLocale(locale: string): string {
  const normalized = locale.toLowerCase();
  if (MESSAGE_CATALOG[normalized]) {
    return normalized;
  }
  const language = normalized.split("-")[0];
  if (MESSAGE_CATALOG[language]) {
    return language;
  }
  return DEFAULT_LOCALE;
}

export function resolveLocale(locale: string | undefined | null): string {
  if (!locale) return DEFAULT_LOCALE;
  return normalizeLocale(locale);
}

export function getMessages(locale: string): Messages {
  const normalized = normalizeLocale(locale);
  return MESSAGE_CATALOG[normalized] ?? DEFAULT_MESSAGES;
}

type ProviderProps = {
  locale: string;
  messages?: Messages;
  children: ReactNode;
};

function formatMessageInternal(
  locale: string,
  catalog: Messages,
  descriptor: MessageDescriptor,
  values?: MessageValues
): string {
  const template = catalog[descriptor.id] ?? descriptor.defaultMessage ?? descriptor.id;
  if (!values || Object.keys(values).length === 0) {
    return template;
  }
  return formatIcu(template, locale, catalog, values);
}

function createFormatters(locale: string, messages: Messages) {
  const numberFormatterCache = new Map<string, Intl.NumberFormat>();
  const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

  const getNumberFormatter = (options?: Intl.NumberFormatOptions) => {
    const key = JSON.stringify(options ?? {});
    let formatter = numberFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options);
      numberFormatterCache.set(key, formatter);
    }
    return formatter;
  };

  const getDateFormatter = (options?: Intl.DateTimeFormatOptions) => {
    const key = JSON.stringify(options ?? {});
    let formatter = dateFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, options);
      dateFormatterCache.set(key, formatter);
    }
    return formatter;
  };

  return {
    formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) =>
      formatMessageInternal(locale, messages, descriptor, values),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      getNumberFormatter(options).format(value),
    formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return getDateFormatter({ ...(options ?? {}), timeZone: options?.timeZone }).format(date);
    },
    formatTime: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return getDateFormatter({ ...(options ?? {}), timeStyle: options?.timeStyle, dateStyle: undefined }).format(date);
    },
    formatUnit: (
      value: number,
      unit: Intl.NumberFormatOptions["unit"],
      options?: Intl.NumberFormatOptions
    ) =>
      getNumberFormatter({ style: "unit", unitDisplay: "narrow", unit, ...(options ?? {}) }).format(value)
  };
}

export function I18nProvider({ locale, messages, children }: ProviderProps) {
  const normalizedLocale = resolveLocale(locale);
  const resolvedMessages = messages ?? getMessages(normalizedLocale);
  const value = useMemo(() => {
    const formatters = createFormatters(normalizedLocale, resolvedMessages);
    return {
      locale: normalizedLocale,
      messages: resolvedMessages,
      ...formatters
    } satisfies I18nContextValue;
  }, [normalizedLocale, resolvedMessages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function formatMessage(
  locale: string,
  messages: Messages,
  descriptor: MessageDescriptor,
  values?: MessageValues
): string {
  return formatMessageInternal(locale, messages, descriptor, values);
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

export type MessageDescriptor = {
  id: string;
  defaultMessage?: string;
};

export type MessageValues = Record<string, unknown>;

export type MessageDictionary = Record<string, string>;

export type MessagesByLocale = Record<string, MessageDictionary>;

type TranslateOptions = {
  defaultValue?: string;
} & MessageValues;

type I18nContextValue = {
  locale: string;
  availableLocales: string[];
  setLocale: (locale: string) => void;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  t: (key: string, options?: TranslateOptions) => string;
};

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: string;
  fallbackLocale?: string;
  messages: MessagesByLocale;
  onLocaleChange?: (locale: string) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function normalizeLocale(input: string, available: string[], fallback: string) {
  if (!input) return fallback;
  if (available.includes(input)) return input;
  const normalized = input.toLowerCase();
  const baseMatch = available.find((locale) => locale.toLowerCase() === normalized);
  if (baseMatch) return baseMatch;
  const prefixMatch = available.find((locale) => normalized.startsWith(locale.toLowerCase()));
  if (prefixMatch) return prefixMatch;
  const languagePart = normalized.split("-")[0];
  const languageMatch = available.find((locale) => locale.split("-")[0]?.toLowerCase() === languagePart);
  return languageMatch ?? fallback;
}

function serializeNumberFormatOptions(options?: Intl.NumberFormatOptions) {
  if (!options) return "{}";
  return JSON.stringify(
    Object.keys(options)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        const optionKey = key as keyof Intl.NumberFormatOptions;
        accumulator[optionKey] = options[optionKey];
        return accumulator;
      }, {})
  );
}

function resolveMessages(locale: string, fallbackLocale: string, messages: MessagesByLocale): Map<string, string> {
  const primary = messages[locale] ?? {};
  const fallback = locale === fallbackLocale ? {} : messages[fallbackLocale] ?? {};
  return new Map<string, string>([
    ...Object.entries(fallback),
    ...Object.entries(primary)
  ]);
}

export function I18nProvider({
  children,
  initialLocale = "en",
  fallbackLocale = "en",
  messages,
  onLocaleChange
}: I18nProviderProps) {
  const availableLocales = useMemo(() => Object.keys(messages), [messages]);
  const [locale, setLocaleState] = useState(() =>
    normalizeLocale(initialLocale, availableLocales, fallbackLocale)
  );
  const numberFormatterCache = useRef(new Map<string, Intl.NumberFormat>());

  useEffect(() => {
    numberFormatterCache.current.clear();
  }, [locale]);

  useEffect(() => {
    setLocaleState((current) => normalizeLocale(current, availableLocales, fallbackLocale));
  }, [availableLocales, fallbackLocale]);

  const resolvedMessages = useMemo(
    () => resolveMessages(locale, fallbackLocale, messages),
    [locale, fallbackLocale, messages]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const cacheKey = `${locale}:${serializeNumberFormatOptions(options)}`;
      let formatter = numberFormatterCache.current.get(cacheKey);
      if (!formatter) {
        formatter = new Intl.NumberFormat(locale, options);
        numberFormatterCache.current.set(cacheKey, formatter);
      }
      return formatter.format(value);
    },
    [locale]
  );

  const formatTemplate = useCallback(
    function formatTemplateRecursive(template: string, values?: MessageValues): string {
      const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        if (typeof value === "number") {
          return formatNumber(value);
        }
        if (value instanceof Date) {
          return value.toLocaleString(locale);
        }
        return String(value);
      };

      const formatPlaceholder = (content: string): string => {
        if (!content) {
          return "";
        }

        const segments: string[] = [];
        let depth = 0;
        let segmentStart = 0;

        for (let i = 0; i < content.length; i += 1) {
          const character = content[i];
          if (character === "{") {
            depth += 1;
          } else if (character === "}") {
            depth = Math.max(depth - 1, 0);
          } else if (character === "," && depth === 0) {
            segments.push(content.slice(segmentStart, i).trim());
            segmentStart = i + 1;
          }
        }
        segments.push(content.slice(segmentStart).trim());

        const [rawKey, type, ...rest] = segments;
        const key = rawKey ?? "";
        const value = values?.[key];

        if (!type) {
          return formatValue(value);
        }

        if (type === "number") {
          const style = rest[0]?.trim();
          const options: Intl.NumberFormatOptions = {};
          if (style === "integer") {
            options.maximumFractionDigits = 0;
          }
          const numericValue = typeof value === "number" ? value : Number(value ?? 0);
          return formatNumber(numericValue, options);
        }

        if (type === "plural") {
          const pluralOptions = rest.join(",").trim();
          if (typeof value !== "number") {
            return "";
          }
          const optionsMap: Record<string, string> = {};
          let optionIndex = 0;
          while (optionIndex < pluralOptions.length) {
            while (optionIndex < pluralOptions.length && /\s/.test(pluralOptions[optionIndex] ?? "")) {
              optionIndex += 1;
            }
            let optionKey = "";
            while (optionIndex < pluralOptions.length) {
              const char = pluralOptions[optionIndex];
              if (!char || /[\s{]/.test(char)) {
                break;
              }
              optionKey += char;
              optionIndex += 1;
            }
            while (optionIndex < pluralOptions.length && /\s/.test(pluralOptions[optionIndex] ?? "")) {
              optionIndex += 1;
            }
            if (pluralOptions[optionIndex] !== "{") {
              break;
            }
            optionIndex += 1; // skip "{"
            let optionDepth = 1;
            const bodyStart = optionIndex;
            while (optionIndex < pluralOptions.length && optionDepth > 0) {
              const char = pluralOptions[optionIndex];
              if (char === "{") {
                optionDepth += 1;
              } else if (char === "}") {
                optionDepth -= 1;
              }
              optionIndex += 1;
            }
            const body = pluralOptions.slice(bodyStart, optionIndex - 1);
            optionsMap[optionKey] = body;
          }

          const pluralRule = new Intl.PluralRules(locale);
          const category = pluralRule.select(value);
          const selected = optionsMap[category] ?? optionsMap.other ?? "";
          const formattedCount = formatNumber(value, { maximumFractionDigits: 0 });
          return formatTemplateRecursive(selected.replace(/#/g, formattedCount), values);
        }

        return formatValue(value);
      };

      let result = "";
      let index = 0;

      while (index < template.length) {
        const openIndex = template.indexOf("{", index);
        if (openIndex === -1) {
          result += template.slice(index);
          break;
        }

        result += template.slice(index, openIndex);
        let depth = 1;
        let cursor = openIndex + 1;

        while (cursor < template.length && depth > 0) {
          if (template[cursor] === "{") {
            depth += 1;
          } else if (template[cursor] === "}") {
            depth -= 1;
          }
          cursor += 1;
        }

        if (depth !== 0) {
          result += template.slice(openIndex);
          break;
        }

        const placeholderContent = template.slice(openIndex + 1, cursor - 1);
        result += formatPlaceholder(placeholderContent.trim());
        index = cursor;
      }

      return result;
    },
    [formatNumber, locale]
  );

  const getMessage = useCallback(
    (id: string, defaultMessage?: string) => {
      if (resolvedMessages.has(id)) {
        return resolvedMessages.get(id) ?? defaultMessage ?? id;
      }
      return defaultMessage ?? id;
    },
    [resolvedMessages]
  );

  const formatMessage = useCallback(
    (descriptor: MessageDescriptor, values?: MessageValues) => {
      const template = getMessage(descriptor.id, descriptor.defaultMessage ?? descriptor.id);
      return formatTemplate(template, values);
    },
    [formatTemplate, getMessage]
  );

  const translate = useCallback(
    (key: string, options?: TranslateOptions) => {
      const { defaultValue, ...values } = options ?? {};
      const template = getMessage(key, typeof defaultValue === "string" ? defaultValue : undefined);
      return formatTemplate(template, values);
    },
    [formatTemplate, getMessage]
  );

  const setLocale = useCallback(
    (nextLocale: string) => {
      const normalized = normalizeLocale(nextLocale, availableLocales, fallbackLocale);
      setLocaleState(normalized);
      onLocaleChange?.(normalized);
    },
    [availableLocales, fallbackLocale, onLocaleChange]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      availableLocales,
      setLocale,
      formatMessage,
      formatNumber,
      t: translate
    }),
    [availableLocales, formatMessage, formatNumber, locale, setLocale, translate]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

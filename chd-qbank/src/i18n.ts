import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type MessageDescriptor = {
  id: string;
  defaultMessage: string;
};

type MessageValues = Record<string, unknown>;

type I18nContextValue = {
  locale: string;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

type I18nProviderProps = {
  children: ReactNode;
  locale?: string;
  messages?: Record<string, string>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function serializeNumberFormatOptions(options?: Intl.NumberFormatOptions) {
  if (!options) return "{}";
  return JSON.stringify(Object.keys(options)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const optionKey = key as keyof Intl.NumberFormatOptions;
      accumulator[optionKey] = options[optionKey];
      return accumulator;
    }, {}));
}

export function I18nProvider({ children, locale = "en-US", messages }: I18nProviderProps) {
  const resolvedMessages = useMemo(() => new Map(Object.entries(messages ?? {})), [messages]);
  const numberFormatterCache = useRef(new Map<string, Intl.NumberFormat>());

  useEffect(() => {
    numberFormatterCache.current.clear();
  }, [locale]);

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const cacheKey = serializeNumberFormatOptions(options);
      let formatter = numberFormatterCache.current.get(cacheKey);
      if (!formatter) {
        formatter = new Intl.NumberFormat(locale, options);
        numberFormatterCache.current.set(cacheKey, formatter);
      }
      return formatter.format(value);
    },
    [locale]
  );

  const formatMessage = useCallback(
    (descriptor: MessageDescriptor, values?: MessageValues) => {
      const template = resolvedMessages.get(descriptor.id) ?? descriptor.defaultMessage ?? descriptor.id;

      const formatValue = (value: unknown) => {
        if (value === null || value === undefined) return "";
        if (typeof value === "number") {
          return formatNumber(value);
        }
        return String(value);
      };

      const formatTemplate = (input: string): string => {
        let result = "";
        let index = 0;

        while (index < input.length) {
          const openIndex = input.indexOf("{", index);
          if (openIndex === -1) {
            result += input.slice(index);
            break;
          }

          result += input.slice(index, openIndex);
          let depth = 1;
          let cursor = openIndex + 1;

          while (cursor < input.length && depth > 0) {
            if (input[cursor] === "{") {
              depth += 1;
            } else if (input[cursor] === "}") {
              depth -= 1;
            }
            cursor += 1;
          }

          if (depth !== 0) {
            // Unbalanced braces; append remainder and exit.
            result += input.slice(openIndex);
            break;
          }

          const placeholderContent = input.slice(openIndex + 1, cursor - 1);
          result += formatPlaceholder(placeholderContent.trim());
          index = cursor;
        }

        return result;
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
          if (character === "{" ) {
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
            let bodyStart = optionIndex;
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
          return formatTemplate(selected.replace(/#/g, formattedCount));
        }

        return formatValue(value);
      };

      return formatTemplate(template);
    },
    [formatNumber, resolvedMessages]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      formatMessage,
      formatNumber
    }),
    [locale, formatMessage, formatNumber]
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

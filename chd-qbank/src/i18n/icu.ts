import type { Messages } from "./types";

function splitTopLevel(input: string, delimiter: "," | "|"): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      if (depth > 0) {
        depth -= 1;
      }
    }
    if (char === delimiter && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim().length > 0) {
    parts.push(current.trim());
  }
  return parts;
}

function normalizeDateValue(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumberWithStyle(value: number, locale: string, style?: string): string {
  const options: Intl.NumberFormatOptions = {};
  if (style) {
    const trimmed = style.trim();
    if (trimmed === "integer") {
      options.maximumFractionDigits = 0;
      options.minimumFractionDigits = 0;
    } else if (trimmed === "percent") {
      options.style = "percent";
      options.maximumFractionDigits = 0;
    } else if (trimmed === "percent-1") {
      options.style = "percent";
      options.maximumFractionDigits = 1;
    } else if (trimmed === "decimal-1") {
      options.maximumFractionDigits = 1;
    } else if (trimmed.startsWith("::")) {
      if (trimmed === "::percent") {
        options.style = "percent";
      } else if (trimmed.startsWith("::unit/")) {
        const unit = trimmed.slice("::unit/".length) as Intl.NumberFormatOptions["unit"];
        options.style = "unit";
        options.unit = unit;
        options.unitDisplay = "narrow";
      }
    } else if (trimmed.startsWith("unit:")) {
      const unit = trimmed.slice("unit:".length) as Intl.NumberFormatOptions["unit"];
      options.style = "unit";
      options.unit = unit;
      options.unitDisplay = "short";
    } else if (trimmed.startsWith("currency/")) {
      const currency = trimmed.slice("currency/".length);
      options.style = "currency";
      options.currency = currency;
    }
  }
  return new Intl.NumberFormat(locale, options).format(value);
}

function formatDate(value: unknown, locale: string, style?: string): string {
  const dateValue = normalizeDateValue(value);
  if (!dateValue) return "";
  const options: Intl.DateTimeFormatOptions = {};
  if (style) {
    const trimmed = style.trim();
    if (trimmed === "short" || trimmed === "medium" || trimmed === "long" || trimmed === "full") {
      options.dateStyle = trimmed;
    }
  }
  return new Intl.DateTimeFormat(locale, options).format(dateValue);
}

function formatTime(value: unknown, locale: string, style?: string): string {
  const dateValue = normalizeDateValue(value);
  if (!dateValue) return "";
  const options: Intl.DateTimeFormatOptions = {};
  if (style) {
    const trimmed = style.trim();
    if (trimmed === "short" || trimmed === "medium" || trimmed === "long" || trimmed === "full") {
      options.timeStyle = trimmed;
    }
  }
  return new Intl.DateTimeFormat(locale, options).format(dateValue);
}

function parsePluralOptions(input: string): Record<string, string> {
  const options: Record<string, string> = {};
  let index = 0;
  while (index < input.length) {
    while (index < input.length && /\s/.test(input[index] ?? "")) {
      index += 1;
    }
    let key = "";
    while (index < input.length) {
      const char = input[index];
      if (char === " " || char === "\t" || char === "\n" || char === "\r" || char === "{") {
        break;
      }
      key += char;
      index += 1;
    }
    while (index < input.length && input[index] !== "{") {
      index += 1;
    }
    if (input[index] !== "{") {
      break;
    }
    index += 1;
    const start = index;
    let depth = 1;
    while (index < input.length && depth > 0) {
      const char = input[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      index += 1;
    }
    const end = index - 1;
    const message = input.slice(start, end);
    if (key) {
      options[key] = message;
    }
  }
  return options;
}

function formatPlural(
  value: unknown,
  locale: string,
  optionsSource: string,
  messages: Messages,
  values: Record<string, unknown> | undefined
): string {
  const numericValue = normalizeNumber(value);
  if (numericValue === null) {
    return "";
  }
  const options = parsePluralOptions(optionsSource);
  const pluralRules = new Intl.PluralRules(locale);
  const exactKey = `=${numericValue}`;
  const category = options[exactKey] ?? options[pluralRules.select(numericValue)] ?? options.other;
  if (!category) {
    return "";
  }
  const numberText = new Intl.NumberFormat(locale).format(numericValue);
  const replaced = category.replace(/#/g, numberText);
  return formatIcu(replaced, locale, messages, values);
}

function formatPlaceholder(
  raw: string,
  locale: string,
  messages: Messages,
  values: Record<string, unknown> | undefined
): string {
  const segments = splitTopLevel(raw, ",");
  const key = segments[0]?.trim();
  if (!key) {
    return "";
  }
  const value = values?.[key];
  if (segments.length === 1) {
    if (value === undefined || value === null) return "";
    return String(value);
  }
  const type = segments[1]?.trim();
  const format = segments[2]?.trim();
  switch (type) {
    case "number": {
      const numericValue = normalizeNumber(value);
      if (numericValue === null) return "";
      return formatNumberWithStyle(numericValue, locale, format);
    }
    case "date": {
      return formatDate(value, locale, format);
    }
    case "time": {
      return formatTime(value, locale, format);
    }
    case "plural": {
      return formatPlural(value, locale, segments.slice(2).join(","), messages, values);
    }
    default: {
      if (value === undefined || value === null) return "";
      return String(value);
    }
  }
}

export function formatIcu(
  message: string,
  locale: string,
  messages: Messages,
  values?: Record<string, unknown>
): string {
  if (!values) return message;
  let index = 0;
  let result = "";
  while (index < message.length) {
    const open = message.indexOf("{", index);
    if (open === -1) {
      result += message.slice(index);
      break;
    }
    result += message.slice(index, open);
    let depth = 1;
    let cursor = open + 1;
    while (cursor < message.length && depth > 0) {
      const char = message[cursor];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      cursor += 1;
    }
    const placeholder = message.slice(open + 1, cursor - 1);
    result += formatPlaceholder(placeholder, locale, messages, values);
    index = cursor;
  }
  return result;
}

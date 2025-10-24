export function formatMs(ms?: number | null): string {
  if (ms === undefined || ms === null) return "–";
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const minuteFormatter = new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: "minute",
    unitDisplay: "narrow"
  });
  const secondFormatter = new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: "second",
    unitDisplay: "narrow"
  });
  if (mins > 0) {
    return `${minuteFormatter.format(mins)} ${secondFormatter.format(secs)}`;
  }
  return secondFormatter.format(secs);
}

export function clampMs(ms: number): number {
  return Math.min(600_000, Math.max(0, ms));
}

export function percentage(part: number, total: number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0
  });
  if (total === 0) return formatter.format(0);
  return formatter.format(part / total);
}

export function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed) return trimmed;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message) return message;
  }
  return fallback;
}

/**
 * Format a millisecond duration into a human readable string.
 *
 * @param ms - Duration in milliseconds, or nullish when unavailable.
 * @returns Friendly text such as `42s` or `2m 10s`; a dash when no value is provided.
 */
export function formatMs(ms?: number | null): string {
  if (ms === undefined || ms === null) return "–";
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Clamp a duration between zero and the maximum practice question timer (10 minutes).
 *
 * @param ms - Raw duration in milliseconds.
 * @returns Value restricted to the inclusive range `[0, 600_000]`.
 */
export function clampMs(ms: number): number {
  return Math.min(600_000, Math.max(0, ms));
}

/**
 * Convert a ratio into a rounded percentage string.
 *
 * @param part - Portion of the total.
 * @param total - Overall value used as the denominator.
 * @returns String percentage, defaults to `0%` when the total is zero.
 */
export function percentage(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

/**
 * Compose CSS class names by stripping falsy values.
 *
 * @param classes - List of class name candidates.
 * @returns Joined class string with falsy entries removed.
 */
export function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Extract a human readable message from an unknown error-like value.
 *
 * @param error - Value thrown by an async operation.
 * @param fallback - Message to use when a better one cannot be derived.
 * @returns The extracted or fallback message.
 */
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

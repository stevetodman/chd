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
 * Attempt to read a human-friendly message from an unknown error-like value.
 *
 * @param error - Value thrown by an async operation.
 * @returns The extracted message when available; otherwise `null`.
 */
export function extractErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

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

  return null;
}

/**
 * Extract a human readable message from an unknown error-like value.
 *
 * @param error - Value thrown by an async operation.
 * @param fallback - Message to use when a better one cannot be derived.
 * @returns The extracted or fallback message.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return extractErrorMessage(error) ?? fallback;
}

/**
 * Normalize a thrown error message into lower case text for comparisons.
 *
 * @param error - Value thrown by an async operation.
 * @returns Lowercase message text when available, otherwise `null`.
 */
export function normalizeErrorMessage(error: unknown): string | null {
  const message = extractErrorMessage(error);
  return message ? message.toLowerCase() : null;
}

/**
 * Canonicalize an email address for authentication and identity comparisons.
 *
 * Supabase treats email addresses as unique identifiers, but end users often
 * paste values that include stray whitespace, zero-width characters, or mixed
 * casing. Normalizing those inputs prevents accidental duplicate accounts and
 * avoids confusing “invalid login” errors when attempting password recovery.
 *
 * @param email - Raw email address provided by the user.
 * @returns Sanitized, lowercased email text with extraneous characters removed.
 */
export function normalizeEmailAddress(email: string): string {
  if (!email) return "";

  return email
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

import type { PracticeFilters } from "../../hooks/usePracticeSession";
import type { MessageDescriptor, MessageValues } from "../../i18n";

type FormatMessage = (descriptor: MessageDescriptor, values?: MessageValues) => string;

export function buildFilterSummaryParts(filters: PracticeFilters, formatMessage: FormatMessage): string[] {
  const parts: string[] = [];
  if (filters.topic) parts.push(filters.topic);
  if (filters.lesion) parts.push(filters.lesion);
  if (filters.flagged === "flagged") {
    parts.push(formatMessage({ id: "practice.filters.flagged", defaultMessage: "Flagged only" }));
  }
  if (filters.status === "new") {
    parts.push(formatMessage({ id: "practice.filters.new", defaultMessage: "New questions" }));
  }
  if (filters.status === "seen") {
    parts.push(formatMessage({ id: "practice.filters.seen", defaultMessage: "Seen questions" }));
  }
  parts.push(
    formatMessage(
      {
        id: "practice.filters.sessionLength",
        defaultMessage: "{count, plural, one {# question session} other {# question session}}"
      },
      { count: filters.sessionLength }
    )
  );
  return parts;
}

export function formatStatusLabel(status: PracticeFilters["status"], formatMessage: FormatMessage): string {
  switch (status) {
    case "new":
      return formatMessage({ id: "practice.filters.status.new", defaultMessage: "New to me" });
    case "seen":
      return formatMessage({ id: "practice.filters.status.seen", defaultMessage: "Seen before" });
    default:
      return formatMessage({ id: "practice.filters.status.all", defaultMessage: "All questions" });
  }
}

export function formatSessionLengthLabel(length: number, formatMessage: FormatMessage): string {
  return formatMessage(
    { id: "practice.filters.sessionLengthOption", defaultMessage: "{count} questions" },
    { count: length }
  );
}

import { FilterChip } from "../../components/ui/FilterChip";
import { FormField, FormFieldset } from "../../components/ui/FormField";
import { Select } from "../../components/ui/Select";
import type { PracticeFilters } from "../../hooks/usePracticeSession";
import type { PracticeFilterOptions } from "../../hooks/usePracticeSession";
import type { MessageDescriptor, MessageValues } from "../../i18n";

interface PracticeFilterFieldsProps {
  value: PracticeFilters;
  onChange: (next: PracticeFilters) => void;
  filterOptions: PracticeFilterOptions;
  filterOptionsLoading: boolean;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  errorMessage?: string | null;
  idPrefix?: string;
}

export function PracticeFilterFields({
  value,
  onChange,
  filterOptions,
  filterOptionsLoading,
  formatMessage,
  errorMessage,
  idPrefix = "practice"
}: PracticeFilterFieldsProps) {
  const updateFilters = (patch: Partial<PracticeFilters>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <>
      {errorMessage ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={formatMessage({ id: "practice.filters.topic", defaultMessage: "Topic" })}>
          <Select
            value={value.topic ?? ""}
            onChange={(event) =>
              updateFilters({ topic: event.target.value ? event.target.value : null })
            }
            disabled={filterOptionsLoading}
          >
            <option value="">
              {formatMessage({ id: "practice.filters.topic.all", defaultMessage: "All topics" })}
            </option>
            {filterOptions.topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={formatMessage({ id: "practice.filters.lesion", defaultMessage: "Lesion" })}>
          <Select
            value={value.lesion ?? ""}
            onChange={(event) =>
              updateFilters({ lesion: event.target.value ? event.target.value : null })
            }
            disabled={filterOptionsLoading}
          >
            <option value="">
              {formatMessage({ id: "practice.filters.lesion.all", defaultMessage: "All lesions" })}
            </option>
            {filterOptions.lesions.map((lesion) => (
              <option key={lesion} value={lesion}>
                {lesion}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormFieldset
        legend={formatMessage({ id: "practice.filters.status", defaultMessage: "Question status" })}
        contentClassName="sm:grid-cols-3"
      >
        {["all", "new", "seen"].map((rawValue) => {
          const statusValue = rawValue as PracticeFilters["status"];
          const label =
            statusValue === "new"
              ? formatMessage({ id: "practice.filters.status.new", defaultMessage: "New to me" })
              : statusValue === "seen"
                ? formatMessage({ id: "practice.filters.status.seen", defaultMessage: "Seen before" })
                : formatMessage({ id: "practice.filters.status.all", defaultMessage: "All questions" });
          return (
            <FilterChip key={statusValue} active={value.status === statusValue}>
              <input
                type="radio"
                name={`${idPrefix}-question-status`}
                value={statusValue}
                checked={value.status === statusValue}
                onChange={() => updateFilters({ status: statusValue })}
                className="sr-only"
              />
              <span>{label}</span>
            </FilterChip>
          );
        })}
      </FormFieldset>
      <FilterChip tone="brand" active={value.flagged === "flagged"}>
        <input
          type="checkbox"
          checked={value.flagged === "flagged"}
          onChange={(event) => updateFilters({ flagged: event.target.checked ? "flagged" : "all" })}
          className="sr-only"
        />
        <span>
          {formatMessage({ id: "practice.filters.flaggedOnly", defaultMessage: "Show only questions I’ve flagged" })}
        </span>
      </FilterChip>
      <FormField label={formatMessage({ id: "practice.filters.sessionLengthLabel", defaultMessage: "Session length" })}>
        <Select
          value={value.sessionLength}
          onChange={(event) =>
            updateFilters({ sessionLength: Number.parseInt(event.target.value, 10) })
          }
        >
          {[10, 20, 40, 60].map((length) => (
            <option key={length} value={length}>
              {formatMessage(
                { id: "practice.filters.sessionLengthOption", defaultMessage: "{count} questions" },
                { count: length }
              )}
            </option>
          ))}
        </Select>
      </FormField>
    </>
  );
}

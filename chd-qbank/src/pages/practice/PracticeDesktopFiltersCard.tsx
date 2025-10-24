import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import type { PracticeFilters } from "../../hooks/usePracticeSession";
import type { PracticeFilterOptions } from "../../hooks/usePracticeSession";
import type { MessageDescriptor, MessageValues } from "../../i18n";
import { PracticeFilterFields } from "./PracticeFilterFields";

interface PracticeDesktopFiltersCardProps {
  filters: PracticeFilters;
  filterOptions: PracticeFilterOptions;
  filterOptionsLoading: boolean;
  filterOptionsError: string | null;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  filterSummary: string;
  sessionLengthLabel: string;
  onFiltersChange: (filters: PracticeFilters) => void;
  onOpenSheet: () => void;
  onReset: () => void;
  onCycleSessionLength: () => void;
  showOptionsLoadingHint: boolean;
  className?: string;
}

export function PracticeDesktopFiltersCard({
  filters,
  filterOptions,
  filterOptionsLoading,
  filterOptionsError,
  formatMessage,
  filterSummary,
  sessionLengthLabel,
  onFiltersChange,
  onOpenSheet,
  onReset,
  onCycleSessionLength,
  showOptionsLoadingHint,
  className
}: PracticeDesktopFiltersCardProps) {
  return (
    <Card variant="secondary" className={className}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">
          {formatMessage({ id: "practice.filters.quickAdjustments", defaultMessage: "Focus filters" })}
        </CardTitle>
        <p className="text-xs uppercase tracking-wide text-neutral-500">{filterSummary}</p>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-neutral-700">
        <PracticeFilterFields
          value={filters}
          onChange={onFiltersChange}
          filterOptions={filterOptions}
          filterOptionsLoading={filterOptionsLoading}
          formatMessage={formatMessage}
          errorMessage={filterOptionsError}
          idPrefix="desktop"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {formatMessage({ id: "practice.filters.sessionLengthLabel", defaultMessage: "Session length" })}
            </p>
            <p className="text-sm font-semibold text-neutral-900">{sessionLengthLabel}</p>
          </div>
          <Button type="button" variant="secondary" onClick={onCycleSessionLength}>
            {formatMessage({ id: "practice.filters.sessionLength.cycle", defaultMessage: "Change length" })}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="secondary" onClick={onOpenSheet}>
            {formatMessage({ id: "practice.filters.openFull", defaultMessage: "Open full filter view" })}
          </Button>
          <Button type="button" variant="ghost" onClick={onReset}>
            {formatMessage({ id: "practice.filters.reset", defaultMessage: "Reset to defaults" })}
          </Button>
        </div>
        {showOptionsLoadingHint ? (
          <span className="block text-xs text-neutral-500">
            {formatMessage({ id: "practice.filters.loading", defaultMessage: "Loading filter options…" })}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

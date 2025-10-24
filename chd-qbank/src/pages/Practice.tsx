import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import PageState from "../components/PageState";
import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { FilterChip } from "../components/ui/FilterChip";
import { FormField, FormFieldset } from "../components/ui/FormField";
import { Select } from "../components/ui/Select";
import {
  DEFAULT_PRACTICE_FILTERS,
  type PracticeFilters,
  usePracticeSession
} from "../hooks/usePracticeSession";
import { useI18n } from "../i18n";

export default function Practice() {
  const {
    questions,
    currentQuestion,
    currentResponse,
    index,
    loading,
    error,
    hasMore,
    next,
    handleAnswer,
    handleFlagChange,
    sessionStats,
    sessionComplete,
    filters,
    applyFilters,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError
  } = usePracticeSession();
  const { formatMessage, formatNumber } = useI18n();
  const [sessionStart, setSessionStart] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pendingFilters, setPendingFilters] = useState<PracticeFilters>({ ...filters });
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  useEffect(() => {
    setPendingFilters({ ...filters });
  }, [filters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setElapsedMs(Date.now() - sessionStart);
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - sessionStart);
    }, 1000);
    return () => window.clearInterval(id);
  }, [sessionStart]);

  useEffect(() => {
    setSessionStart(Date.now());
    setElapsedMs(0);
  }, [filters]);

  const filterSummaryParts = useMemo(() => {
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
  }, [filters, formatMessage]);

  const filterSummary = useMemo(() => filterSummaryParts.join(" • "), [filterSummaryParts]);

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const minutePart = hours > 0 ? minutes.toString().padStart(2, "0") : minutes.toString();
    const secondPart = seconds.toString().padStart(2, "0");
    return hours > 0
      ? `${hours}:${minutePart}:${secondPart}`
      : `${minutePart}:${secondPart}`;
  }, [elapsedMs]);

  const statusLabel = useMemo(() => {
    switch (filters.status) {
      case "new":
        return formatMessage({ id: "practice.filters.status.new", defaultMessage: "New to me" });
      case "seen":
        return formatMessage({ id: "practice.filters.status.seen", defaultMessage: "Seen before" });
      default:
        return formatMessage({ id: "practice.filters.status.all", defaultMessage: "All questions" });
    }
  }, [filters.status, formatMessage]);

  const progressPercent = useMemo(() => {
    if (questions.length === 0) return 0;
    const percentage = ((index + 1) / questions.length) * 100;
    return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  }, [index, questions.length]);

  const flaggedActive = filters.flagged === "flagged";

  const sessionLengthLabel = useMemo(
    () =>
      formatMessage(
        { id: "practice.filters.sessionLengthOption", defaultMessage: "{count} questions" },
        { count: filters.sessionLength }
      ),
    [filters.sessionLength, formatMessage]
  );

  const quickActionButtonClasses =
    "inline-flex items-center gap-2 rounded-full border border-surface-muted bg-surface-base px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-brand-300 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300";

  const quickStatusLabel = useMemo(
    () =>
      formatMessage(
        { id: "practice.filters.quickStatus", defaultMessage: "Status: {label}" },
        { label: statusLabel }
      ),
    [formatMessage, statusLabel]
  );

  const quickFlaggedLabel = useMemo(
    () =>
      flaggedActive
        ? formatMessage({ id: "practice.filters.quickFlaggedActive", defaultMessage: "Flagged only" })
        : formatMessage({ id: "practice.filters.quickFlaggedInactive", defaultMessage: "All questions" }),
    [flaggedActive, formatMessage]
  );

  const quickLengthLabel = useMemo(
    () =>
      formatMessage(
        { id: "practice.filters.quickLength", defaultMessage: "Length: {count}" },
        { count: filters.sessionLength }
      ),
    [filters.sessionLength, formatMessage]
  );

  const filterChanged = useMemo(() => {
    return (
      filters.topic !== pendingFilters.topic ||
      filters.lesion !== pendingFilters.lesion ||
      filters.flagged !== pendingFilters.flagged ||
      filters.status !== pendingFilters.status ||
      filters.sessionLength !== pendingFilters.sessionLength
    );
  }, [filters, pendingFilters]);

  const applyFilterPatch = (patch: Partial<PracticeFilters>) => {
    applyFilters({ ...filters, ...patch });
  };

  const toggleFlaggedFilter = () => {
    applyFilterPatch({ flagged: filters.flagged === "flagged" ? "all" : "flagged" });
  };

  const cycleStatusFilter = () => {
    const order: PracticeFilters["status"][] = ["all", "new", "seen"];
    const currentIndex = order.indexOf(filters.status);
    const nextStatus = order[(currentIndex + 1) % order.length];
    applyFilterPatch({ status: nextStatus });
  };

  const cycleSessionLength = () => {
    const lengths = [10, 20, 40, 60];
    const currentIndex = lengths.indexOf(filters.sessionLength);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % lengths.length;
    applyFilterPatch({ sessionLength: lengths[nextIndex] });
  };

  const applyPendingFilters = () => {
    if (!filterChanged) return;
    applyFilters({ ...pendingFilters });
  };

  const resetFilters = () => {
    setPendingFilters({ ...DEFAULT_PRACTICE_FILTERS });
    applyFilters({ ...DEFAULT_PRACTICE_FILTERS });
  };

  const handleDesktopReset = () => {
    applyFilterPatch({ ...DEFAULT_PRACTICE_FILTERS });
  };

  useEffect(() => {
    if (questions.length === 0) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("practice:has-started", "true");
  }, [questions.length]);

  if (loading && questions.length === 0) {
    return (
      <PageState
        title={formatMessage({ id: "practice.loading.title", defaultMessage: "Loading practice session" })}
        description={formatMessage({
          id: "practice.loading.description",
          defaultMessage: "We’re generating the next set of questions for you."
        })}
        fullHeight
      />
    );
  }

  if (error && questions.length === 0) {
    return (
      <PageState
        title={formatMessage({ id: "practice.error.title", defaultMessage: "We couldn’t load questions" })}
        description={error}
        variant="error"
        fullHeight
      />
    );
  }

  if (!currentQuestion)
    return (
      <PageState
        title={formatMessage({ id: "practice.empty.title", defaultMessage: "No questions found" })}
        description={formatMessage({
          id: "practice.empty.description",
          defaultMessage: "Adjust your filters or try refreshing to start a new session."
        })}
        variant="empty"
        fullHeight
      />
    );

  const canAdvance = !(
    (!hasMore && index >= questions.length - 1) || questions.length === 0
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key?.toLowerCase() !== "n") return;
      if (!canAdvance) return;

      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      next();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance, next]);

  const renderFilterFields = () => (
    <>
      {filterOptionsError ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {filterOptionsError}
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={formatMessage({ id: "practice.filters.topic", defaultMessage: "Topic" })}>
          <Select
            value={pendingFilters.topic ?? ""}
            onChange={(event) =>
              setPendingFilters((prev) => ({
                ...prev,
                topic: event.target.value ? event.target.value : null
              }))
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
            value={pendingFilters.lesion ?? ""}
            onChange={(event) =>
              setPendingFilters((prev) => ({
                ...prev,
                lesion: event.target.value ? event.target.value : null
              }))
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
        {[
          {
            value: "all",
            label: formatMessage({ id: "practice.filters.status.all", defaultMessage: "All questions" })
          },
          {
            value: "new",
            label: formatMessage({ id: "practice.filters.status.new", defaultMessage: "New to me" })
          },
          {
            value: "seen",
            label: formatMessage({ id: "practice.filters.status.seen", defaultMessage: "Seen before" })
          }
        ].map((option) => (
          <FilterChip key={option.value} active={pendingFilters.status === option.value}>
            <input
              type="radio"
              name="question-status"
              value={option.value}
              checked={pendingFilters.status === option.value}
              onChange={() =>
                setPendingFilters((prev) => ({
                  ...prev,
                  status: option.value as PracticeFilters["status"]
                }))
              }
              className="sr-only"
            />
            <span>{option.label}</span>
          </FilterChip>
        ))}
      </FormFieldset>
      <FilterChip tone="brand" active={pendingFilters.flagged === "flagged"}>
        <input
          type="checkbox"
          checked={pendingFilters.flagged === "flagged"}
          onChange={(event) =>
            setPendingFilters((prev) => ({
              ...prev,
              flagged: event.target.checked ? "flagged" : "all"
            }))
          }
          className="sr-only"
        />
        <span>{formatMessage({ id: "practice.filters.flaggedOnly", defaultMessage: "Show only questions I’ve flagged" })}</span>
      </FilterChip>
      <FormField label={formatMessage({ id: "practice.filters.sessionLengthLabel", defaultMessage: "Session length" })}>
        <Select
          value={pendingFilters.sessionLength}
          onChange={(event) =>
            setPendingFilters((prev) => ({
              ...prev,
              sessionLength: Number.parseInt(event.target.value, 10)
            }))
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

  const SessionRailCard = ({ className }: { className?: string }) => (
    <Card variant="secondary" className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {formatMessage({ id: "practice.sessionRail.title", defaultMessage: "Session overview" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-neutral-700">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <span>{formatMessage({ id: "practice.sessionRail.progress", defaultMessage: "Progress" })}</span>
            <span>
              {formatMessage(
                {
                  id: "practice.progress.counter",
                  defaultMessage: "Q {current, number, integer} of {total, number, integer}"
                },
                { current: index + 1, total: questions.length }
              )}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.elapsed", defaultMessage: "Elapsed time" })}
            </dt>
            <dd className="font-semibold text-neutral-900">{elapsedLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.streak", defaultMessage: "Current streak" })}
            </dt>
            <dd className="font-semibold text-neutral-900">
              {formatMessage(
                {
                  id: "practice.sessionRail.streakValue",
                  defaultMessage: "{count, plural, one {# correct} other {# correct}}"
                },
                { count: sessionStats.currentStreak }
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.accuracy", defaultMessage: "Accuracy" })}
            </dt>
            <dd className="font-semibold text-neutral-900">
              {sessionStats.accuracy !== null
                ? formatNumber(sessionStats.accuracy, { style: "percent", maximumFractionDigits: 0 })
                : formatMessage({
                    id: "practice.sessionRail.accuracyEmpty",
                    defaultMessage: "Not enough data yet"
                  })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.flagged", defaultMessage: "Flagged" })}
            </dt>
            <dd className="font-semibold text-neutral-900">{formatNumber(sessionStats.flagged)}</dd>
          </div>
        </dl>
        <Button
          type="button"
          onClick={next}
          aria-keyshortcuts="n"
          disabled={!canAdvance}
          className="w-full"
        >
          {formatMessage({ id: "practice.actions.next", defaultMessage: "Next question" })}
        </Button>
      </CardContent>
    </Card>
  );

  const DesktopFiltersCard = ({ className }: { className?: string }) => (
    <Card variant="secondary" className={className}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">
          {formatMessage({ id: "practice.filters.quickAdjustments", defaultMessage: "Focus filters" })}
        </CardTitle>
        <p className="text-xs uppercase tracking-wide text-neutral-500">{filterSummary}</p>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-neutral-700">
        {filterOptionsError ? (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
            {filterOptionsError}
          </div>
        ) : null}
        <div className="grid gap-5">
          <FormField label={formatMessage({ id: "practice.filters.topic", defaultMessage: "Topic" })}>
            <Select
              value={filters.topic ?? ""}
              onChange={(event) =>
                applyFilterPatch({
                  topic: event.target.value ? event.target.value : null
                })
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
              value={filters.lesion ?? ""}
              onChange={(event) =>
                applyFilterPatch({
                  lesion: event.target.value ? event.target.value : null
                })
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
          {["all", "new", "seen"].map((value) => {
            const optionValue = value as PracticeFilters["status"];
            const label =
              optionValue === "new"
                ? formatMessage({ id: "practice.filters.status.new", defaultMessage: "New to me" })
                : optionValue === "seen"
                  ? formatMessage({ id: "practice.filters.status.seen", defaultMessage: "Seen before" })
                  : formatMessage({ id: "practice.filters.status.all", defaultMessage: "All questions" });
            return (
              <FilterChip key={optionValue} active={filters.status === optionValue}>
                <input
                  type="radio"
                  name="desktop-question-status"
                  value={optionValue}
                  checked={filters.status === optionValue}
                  onChange={() => applyFilterPatch({ status: optionValue })}
                  className="sr-only"
                />
                <span>{label}</span>
              </FilterChip>
            );
          })}
        </FormFieldset>
        <FilterChip tone="brand" active={flaggedActive}>
          <input
            type="checkbox"
            checked={flaggedActive}
            onChange={toggleFlaggedFilter}
            className="sr-only"
          />
          <span>
            {formatMessage({ id: "practice.filters.flaggedOnly", defaultMessage: "Show only questions I’ve flagged" })}
          </span>
        </FilterChip>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {formatMessage({ id: "practice.filters.sessionLengthLabel", defaultMessage: "Session length" })}
            </p>
            <p className="text-sm font-semibold text-neutral-900">{sessionLengthLabel}</p>
          </div>
          <Button type="button" variant="secondary" onClick={cycleSessionLength}>
            {formatMessage({ id: "practice.filters.sessionLength.cycle", defaultMessage: "Change length" })}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="secondary" onClick={() => setFiltersSheetOpen(true)}>
            {formatMessage({ id: "practice.filters.openFull", defaultMessage: "Open full filter view" })}
          </Button>
          <Button type="button" variant="ghost" onClick={handleDesktopReset}>
            {formatMessage({ id: "practice.filters.reset", defaultMessage: "Reset to defaults" })}
          </Button>
        </div>
        {filterOptionsLoading ? (
          <span className="block text-xs text-neutral-500">
            {formatMessage({ id: "practice.filters.loading", defaultMessage: "Loading filter options…" })}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="pb-10">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-6">
            <SessionRailCard />
            <DesktopFiltersCard />
          </div>
        </aside>
        <div className="flex flex-col gap-6">
          <div className="lg:hidden space-y-4">
            <SessionRailCard />
          </div>
          <div className="space-y-3 lg:hidden">
            <div className="flex flex-wrap gap-2">
              {filterSummaryParts.map((part, index) => (
                <span
                  key={`${part}-${index}`}
                  className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-neutral-600"
                >
                  {part}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={quickActionButtonClasses} onClick={cycleStatusFilter}>
                {quickStatusLabel}
              </button>
              <button
                type="button"
                className={quickActionButtonClasses}
                onClick={toggleFlaggedFilter}
                aria-pressed={flaggedActive}
              >
                {quickFlaggedLabel}
              </button>
              <button type="button" className={quickActionButtonClasses} onClick={cycleSessionLength}>
                {quickLengthLabel}
              </button>
            </div>
            <Dialog.Root open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
              <Dialog.Trigger asChild>
                <Button type="button" variant="secondary" className="w-full">
                  {formatMessage({ id: "practice.filters.adjust", defaultMessage: "Adjust filters" })}
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
                <Dialog.Content className="dialog-content fixed inset-0 z-50 flex flex-col bg-surface-base focus:outline-none">
                  <div className="flex items-center justify-between border-b border-surface-muted px-4 py-4">
                    <Dialog.Title className="text-base font-semibold text-surface-inverted">
                      {formatMessage({ id: "practice.filters.title", defaultMessage: "Practice filters" })}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <Button type="button" variant="ghost" className="text-brand-600 hover:text-brand-500">
                        {formatMessage({ id: "practice.filters.done", defaultMessage: "Done" })}
                      </Button>
                    </Dialog.Close>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-4 text-base text-neutral-700">
                    <div className="space-y-6">{renderFilterFields()}</div>
                  </div>
                  <div className="space-y-3 border-t border-surface-muted px-4 py-4">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        applyPendingFilters();
                        setFiltersSheetOpen(false);
                      }}
                      disabled={!filterChanged}
                    >
                      {formatMessage({ id: "practice.filters.apply", defaultMessage: "Apply filters" })}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        resetFilters();
                        setFiltersSheetOpen(false);
                      }}
                    >
                      {formatMessage({ id: "practice.filters.reset", defaultMessage: "Reset to defaults" })}
                    </Button>
                    {filterOptionsLoading ? (
                      <span className="block text-center text-xs text-neutral-500">
                        {formatMessage({ id: "practice.filters.loading", defaultMessage: "Loading filter options…" })}
                      </span>
                    ) : null}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            onFlagChange={handleFlagChange}
            initialFlagged={currentResponse?.flagged ?? false}
            onNext={next}
            canAdvance={canAdvance}
            progress={{ current: index + 1, total: questions.length }}
          />
          {sessionComplete ? (
            <Card status="success" variant="secondary">
              <CardHeader>
                <CardTitle className="text-base">
                  {formatMessage({ id: "practice.sessionComplete.title", defaultMessage: "Session complete" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-neutral-700">
                <p>
                  {formatMessage(
                    {
                      id: "practice.sessionComplete.summary",
                      defaultMessage:
                        "You worked through {count, plural, one {# question} other {# questions}} this round. Here’s how it went:"
                    },
                    { count: sessionStats.totalAnswered }
                  )}
                </p>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-surface-muted bg-surface-base/80 p-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {formatMessage({ id: "practice.sessionComplete.accuracyLabel", defaultMessage: "Accuracy" })}
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">
                      {sessionStats.accuracy !== null
                        ? formatNumber(sessionStats.accuracy, { style: "percent", maximumFractionDigits: 0 })
                        : formatMessage({
                            id: "practice.sessionComplete.accuracyEmpty",
                            defaultMessage: "Not enough data"
                          })}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-surface-muted bg-surface-base/80 p-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {formatMessage({ id: "practice.sessionComplete.correctLabel", defaultMessage: "Correct answers" })}
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">
                      {formatNumber(sessionStats.totalCorrect)} / {formatNumber(sessionStats.totalAnswered)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-surface-muted bg-surface-base/80 p-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {formatMessage({ id: "practice.sessionComplete.averageTimeLabel", defaultMessage: "Avg. time" })}
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">
                      {sessionStats.averageMs !== null
                        ? formatNumber(sessionStats.averageMs / 1000, {
                            style: "unit",
                            unit: "second",
                            unitDisplay: "narrow",
                            maximumFractionDigits: 1
                          })
                        : formatMessage({
                            id: "practice.sessionComplete.averageTimeEmpty",
                            defaultMessage: "Not recorded"
                          })}
                    </dd>
                  </div>
                </dl>
                {sessionStats.flagged > 0 ? (
                  <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-warning-700">
                    <p className="font-medium">
                      {formatMessage(
                        {
                          id: "practice.sessionComplete.flagged",
                          defaultMessage:
                            "{count, plural, one {# question saved for spaced review.} other {# questions saved for spaced review.}}"
                        },
                        { count: sessionStats.flagged }
                      )}
                    </p>
                    <p className="text-sm">
                      {formatMessage({
                        id: "practice.sessionComplete.reviewPrompt.before",
                        defaultMessage: "Revisit them on the "
                      })}
                      <Link to="/review" className="font-semibold underline">
                        {formatMessage({
                          id: "practice.sessionComplete.reviewLink",
                          defaultMessage: "review page"
                        })}
                      </Link>
                      {formatMessage({
                        id: "practice.sessionComplete.reviewPrompt.after",
                        defaultMessage: " tomorrow to lock in the learning."
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-surface-muted bg-surface-base/80 p-4 text-neutral-700">
                    <p className="font-medium">
                      {formatMessage({
                        id: "practice.sessionComplete.noFlagged",
                        defaultMessage: "No flagged questions yet."
                      })}
                    </p>
                    <p className="text-sm">
                      {formatMessage({
                        id: "practice.sessionComplete.noFlaggedDescription",
                        defaultMessage: "Flag tricky items during practice so they’ll show up in your spaced-review queue."
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}

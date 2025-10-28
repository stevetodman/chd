import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageState from "../components/PageState";
import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import {
  DEFAULT_PRACTICE_FILTERS,
  type PracticeFilters,
  usePracticeSession
} from "../hooks/usePracticeSession";
import { useBadgeStatuses } from "../hooks/useBadgeStatuses";
import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { useI18n } from "../i18n";
import { useSessionStore } from "../lib/auth";
import { PracticeDesktopFiltersCard } from "./practice/PracticeDesktopFiltersCard";
import { PracticeFiltersSheet } from "./practice/PracticeFiltersSheet";
import { PracticeSessionRailCard } from "./practice/PracticeSessionRailCard";
import { buildFilterSummaryParts, formatSessionLengthLabel, formatStatusLabel } from "./practice/filterUtils";

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
    previous,
    handleAnswer,
    handleFlagChange,
    reportIssue,
    sessionStats,
    sessionComplete,
    filters,
    applyFilters,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError
  } = usePracticeSession();
  const { formatMessage, formatNumber } = useI18n();
  const { session } = useSessionStore();
  const { elapsedLabel } = useElapsedTimer(filters);
  const userId = session?.user.id ?? null;
  const {
    badges: earnedBadges,
    loading: badgesLoading,
    error: badgesError
  } = useBadgeStatuses(userId);
  const [pendingFilters, setPendingFilters] = useState<PracticeFilters>({ ...filters });
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  useEffect(() => {
    setPendingFilters({ ...filters });
  }, [filters]);

  useEffect(() => {
    if (questions.length === 0) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("practice:has-started", "true");
  }, [questions.length]);

  const filterSummaryParts = useMemo(
    () => buildFilterSummaryParts(filters, formatMessage),
    [filters, formatMessage]
  );
  const filterSummary = useMemo(() => filterSummaryParts.join(" • "), [filterSummaryParts]);
  const statusLabel = useMemo(() => formatStatusLabel(filters.status, formatMessage), [
    filters.status,
    formatMessage
  ]);
  const flaggedActive = filters.flagged === "flagged";
  const sessionLengthLabel = useMemo(
    () => formatSessionLengthLabel(filters.sessionLength, formatMessage),
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
    applyFilters((current) => ({ ...current, ...patch }));
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

  const totalQuestions = questions.length;

  const progressPercent = useMemo(() => {
    if (totalQuestions === 0) return 0;
    const percentage = ((index + 1) / totalQuestions) * 100;
    return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  }, [index, totalQuestions]);

  const answeredProgressPercent = useMemo(() => {
    if (totalQuestions === 0) return 0;
    const percentage = (sessionStats.totalAnswered / totalQuestions) * 100;
    return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  }, [sessionStats.totalAnswered, totalQuestions]);

  const answeredSummary = useMemo(
    () =>
      formatMessage(
        {
          id: "practice.questionProgress.summary",
          defaultMessage: "{current, number, integer} of {total, number, integer} answered"
        },
        { current: sessionStats.totalAnswered, total: totalQuestions }
      ),
    [formatMessage, sessionStats.totalAnswered, totalQuestions]
  );

  const canAdvance = !(
    (!hasMore && index >= questions.length - 1) || questions.length === 0
  );

  const canGoBack = index > 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const key = event.key;
      const normalized = key?.toLowerCase();
      const goForward = key === "ArrowRight" || normalized === "n";
      const goBackward = key === "ArrowLeft";
      if (!goForward && !goBackward) return;

      if (goForward && !canAdvance) return;
      if (goBackward && !canGoBack) return;

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
      if (goForward) {
        next();
      } else if (goBackward) {
        previous();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance, canGoBack, next, previous]);

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

  return (
    <div className="pb-10">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-6">
            <PracticeSessionRailCard
              currentIndex={index}
              totalQuestions={totalQuestions}
              progressPercent={progressPercent}
              canAdvance={canAdvance}
              onNext={next}
              sessionStats={sessionStats}
              elapsedLabel={elapsedLabel}
              formatMessage={formatMessage}
              formatNumber={formatNumber}
              badges={earnedBadges}
              badgesLoading={badgesLoading}
              badgesError={badgesError}
              showBadges={Boolean(session)}
            />
            <PracticeDesktopFiltersCard
              filters={filters}
              filterOptions={filterOptions}
              filterOptionsLoading={filterOptionsLoading}
              filterOptionsError={filterOptionsError}
              formatMessage={formatMessage}
              filterSummary={filterSummary}
              sessionLengthLabel={sessionLengthLabel}
              onFiltersChange={(nextFilters) => applyFilters(nextFilters)}
              onOpenSheet={() => setFiltersSheetOpen(true)}
              onReset={handleDesktopReset}
              onCycleSessionLength={cycleSessionLength}
              showOptionsLoadingHint={filterOptionsLoading}
            />
          </div>
        </aside>
        <div className="flex flex-col gap-6">
          <div className="lg:hidden space-y-4">
            <PracticeSessionRailCard
              currentIndex={index}
              totalQuestions={totalQuestions}
              progressPercent={progressPercent}
              canAdvance={canAdvance}
              onNext={next}
              sessionStats={sessionStats}
              elapsedLabel={elapsedLabel}
              formatMessage={formatMessage}
              formatNumber={formatNumber}
              badges={earnedBadges}
              badgesLoading={badgesLoading}
              badgesError={badgesError}
              showBadges={Boolean(session)}
            />
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
            <PracticeFiltersSheet
              open={filtersSheetOpen}
              onOpenChange={setFiltersSheetOpen}
              filters={pendingFilters}
              onFiltersChange={(nextFilters) => setPendingFilters(nextFilters)}
              filterOptions={filterOptions}
              filterOptionsLoading={filterOptionsLoading}
              filterOptionsError={filterOptionsError}
              formatMessage={formatMessage}
              onApply={() => {
                applyPendingFilters();
                setFiltersSheetOpen(false);
              }}
              onReset={() => {
                resetFilters();
                setFiltersSheetOpen(false);
              }}
              filterChanged={filterChanged}
              trigger={
                <Button type="button" variant="secondary" className="w-full">
                  {formatMessage({ id: "practice.filters.adjust", defaultMessage: "Adjust filters" })}
                </Button>
              }
            />
          </div>
          <section className="rounded-xl border border-surface-muted bg-surface-base px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span>
                {formatMessage({ id: "practice.questionProgress.title", defaultMessage: "Practice progress" })}
              </span>
              <span>{answeredSummary}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                role="progressbar"
                aria-label={answeredSummary}
                aria-valuemin={0}
                aria-valuemax={totalQuestions}
                aria-valuenow={sessionStats.totalAnswered}
                className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
                style={{ width: `${answeredProgressPercent}%` }}
              />
            </div>
          </section>
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            onFlagChange={handleFlagChange}
            onReportIssue={reportIssue}
            initialFlagged={currentResponse?.flagged ?? false}
            onNext={next}
            canAdvance={canAdvance}
            onPrevious={previous}
            canGoBack={canGoBack}
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

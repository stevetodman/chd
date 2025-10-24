import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [pendingFilters, setPendingFilters] = useState<PracticeFilters>({ ...filters });
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  useEffect(() => {
    setPendingFilters({ ...filters });
  }, [filters]);

  const filterSummaryParts = useMemo(() => {
    const parts: string[] = [];
    if (filters.topic) parts.push(filters.topic);
    if (filters.lesion) parts.push(filters.lesion);
    if (filters.flagged === "flagged") parts.push("Flagged only");
    if (filters.status === "new") parts.push("New questions");
    if (filters.status === "seen") parts.push("Seen questions");
    parts.push(`${filters.sessionLength} question session`);
    return parts;
  }, [filters]);

  const filterSummary = useMemo(() => filterSummaryParts.join(" • "), [filterSummaryParts]);

  const filterChanged = useMemo(() => {
    return (
      filters.topic !== pendingFilters.topic ||
      filters.lesion !== pendingFilters.lesion ||
      filters.flagged !== pendingFilters.flagged ||
      filters.status !== pendingFilters.status ||
      filters.sessionLength !== pendingFilters.sessionLength
    );
  }, [filters, pendingFilters]);

  const applyPendingFilters = () => {
    if (!filterChanged) return;
    applyFilters({ ...pendingFilters });
  };

  const resetFilters = () => {
    setPendingFilters({ ...DEFAULT_PRACTICE_FILTERS });
    applyFilters({ ...DEFAULT_PRACTICE_FILTERS });
  };

  if (loading && questions.length === 0) {
    return (
      <PageState
        title="Loading practice session"
        description="We’re generating the next set of questions for you."
        fullHeight
      />
    );
  }

  if (error && questions.length === 0) {
    return (
      <PageState
        title="We couldn’t load questions"
        description={error}
        variant="error"
        fullHeight
      />
    );
  }

  if (!currentQuestion)
    return (
      <PageState
        title="No questions found"
        description="Adjust your filters or try refreshing to start a new session."
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

  const selectClasses =
    "h-12 w-full rounded-lg border border-neutral-300 bg-white px-4 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const choiceClasses =
    "flex items-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500";

  const renderFilterFields = () => (
    <>
      {filterOptionsError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {filterOptionsError}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Topic</span>
          <select
            className={selectClasses}
            value={pendingFilters.topic ?? ""}
            onChange={(event) =>
              setPendingFilters((prev) => ({
                ...prev,
                topic: event.target.value ? event.target.value : null
              }))
            }
            disabled={filterOptionsLoading}
          >
            <option value="">All topics</option>
            {filterOptions.topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Lesion</span>
          <select
            className={selectClasses}
            value={pendingFilters.lesion ?? ""}
            onChange={(event) =>
              setPendingFilters((prev) => ({
                ...prev,
                lesion: event.target.value ? event.target.value : null
              }))
            }
            disabled={filterOptionsLoading}
          >
            <option value="">All lesions</option>
            {filterOptions.lesions.map((lesion) => (
              <option key={lesion} value={lesion}>
                {lesion}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Question status</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { value: "all", label: "All questions" },
            { value: "new", label: "New to me" },
            { value: "seen", label: "Seen before" }
          ].map((option) => (
            <label key={option.value} className={choiceClasses}>
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
                className="h-5 w-5"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={choiceClasses}>
        <input
          type="checkbox"
          checked={pendingFilters.flagged === "flagged"}
          onChange={(event) =>
            setPendingFilters((prev) => ({
              ...prev,
              flagged: event.target.checked ? "flagged" : "all"
            }))
          }
          className="h-5 w-5"
        />
        <span>Show only questions I’ve flagged</span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Session length</span>
        <select
          className={selectClasses}
          value={pendingFilters.sessionLength}
          onChange={(event) =>
            setPendingFilters((prev) => ({
              ...prev,
              sessionLength: Number(event.target.value)
            }))
          }
        >
          {[10, 20, 30, 40].map((length) => (
            <option key={length} value={length}>
              {length} questions
            </option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-3 md:hidden">
        <div className="flex flex-wrap gap-2">
          {filterSummaryParts.map((part, index) => (
            <span
              key={`${part}-${index}`}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
            >
              {part}
            </span>
          ))}
        </div>
        <Dialog.Root open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
          <Dialog.Trigger asChild>
            <Button type="button" variant="secondary" className="w-full">
              Adjust filters
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-white focus:outline-none">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
                <Dialog.Title className="text-base font-semibold text-neutral-900">
                  Practice filters
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm font-medium text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    Done
                  </button>
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 text-base text-neutral-700">
                <div className="space-y-6">{renderFilterFields()}</div>
              </div>
              <div className="space-y-3 border-t border-neutral-200 px-4 py-4">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    applyPendingFilters();
                    setFiltersSheetOpen(false);
                  }}
                  disabled={!filterChanged}
                >
                  Apply filters
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
                  Reset to defaults
                </Button>
                {filterOptionsLoading ? (
                  <span className="block text-center text-xs text-neutral-500">Loading filter options…</span>
                ) : null}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <Card className="hidden md:block">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Practice session settings</CardTitle>
            <p className="mt-1 text-sm text-neutral-600">
              Choose the topics you want to drill and how long this session should run.
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">{filterSummary}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setFiltersOpen((open) => !open)}>
            {filtersOpen ? "Hide filters" : "Show filters"}
          </Button>
        </CardHeader>
        {filtersOpen ? (
          <CardContent className="space-y-6 text-base text-neutral-700">
            {renderFilterFields()}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={applyPendingFilters}
                disabled={!filterChanged}
                className="w-full sm:w-auto"
              >
                Apply filters
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetFilters}
                className="w-full sm:w-auto"
              >
                Reset to defaults
              </Button>
              {filterOptionsLoading ? (
                <span className="text-xs text-neutral-500 sm:ml-auto">Loading filter options…</span>
              ) : null}
            </div>
          </CardContent>
        ) : null}
      </Card>
      <QuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        onFlagChange={handleFlagChange}
        initialFlagged={currentResponse?.flagged ?? false}
      />
      <div className="sticky bottom-0 z-30 rounded-t-2xl border border-neutral-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:static sm:rounded-lg sm:shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-600">
            Q {index + 1} of {questions.length}
          </div>
          <Button
            type="button"
            onClick={next}
            aria-keyshortcuts="n"
            disabled={!canAdvance}
            className="w-full sm:w-auto"
          >
            Next question
          </Button>
        </div>
      </div>
      {sessionComplete ? (
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base">Session complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-neutral-700">
            <p>
              You worked through {sessionStats.totalAnswered} question{sessionStats.totalAnswered === 1 ? "" : "s"} this round.
              Here’s how it went:
            </p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-neutral-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Accuracy</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {sessionStats.accuracy !== null ? `${Math.round(sessionStats.accuracy * 100)}%` : "Not enough data"}
                </dd>
              </div>
              <div className="rounded-md bg-neutral-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Correct answers</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {sessionStats.totalCorrect} / {sessionStats.totalAnswered}
                </dd>
              </div>
              <div className="rounded-md bg-neutral-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Avg. time</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {sessionStats.averageMs !== null
                    ? `${(sessionStats.averageMs / 1000).toFixed(1)}s`
                    : "Not recorded"}
                </dd>
              </div>
            </dl>
            {sessionStats.flagged > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <p className="font-medium">
                  {sessionStats.flagged} question{sessionStats.flagged === 1 ? "" : "s"} saved for spaced review.
                </p>
                <p className="text-sm">
                  Revisit them on the <Link to="/review" className="font-semibold underline">review page</Link> tomorrow to lock in the learning.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
                <p className="font-medium">No flagged questions yet.</p>
                <p className="text-sm">
                  Flag tricky items during practice so they’ll show up in your spaced-review queue.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

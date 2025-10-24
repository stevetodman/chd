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
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("practice:has-started") !== "true";
  });
  const [pendingFilters, setPendingFilters] = useState<PracticeFilters>({ ...filters });

  useEffect(() => {
    setPendingFilters({ ...filters });
  }, [filters]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.topic) parts.push(filters.topic);
    if (filters.lesion) parts.push(filters.lesion);
    if (filters.flagged === "flagged") parts.push("Flagged only");
    if (filters.status === "new") parts.push("New questions");
    if (filters.status === "seen") parts.push("Seen questions");
    parts.push(`${filters.sessionLength} question session`);
    return parts.join(" • ");
  }, [filters]);

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

  useEffect(() => {
    if (questions.length === 0) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("practice:has-started", "true");
  }, [questions.length]);

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

  return (
    <div className="space-y-6">
      <Card>
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
          <CardContent className="space-y-6 text-sm text-neutral-700">
            {filterOptionsError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                {filterOptionsError}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Topic</span>
                <select
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "all", label: "All questions" },
                  { value: "new", label: "New to me" },
                  { value: "seen", label: "Seen before" }
                ].map((option) => (
                  <label key={option.value} className="inline-flex items-center gap-2">
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
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={pendingFilters.flagged === "flagged"}
                onChange={(event) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    flagged: event.target.checked ? "flagged" : "all"
                  }))
                }
              />
              <span>Show only questions I’ve flagged</span>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Session length</span>
              <select
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 md:w-auto"
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
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={applyPendingFilters} disabled={!filterChanged}>
                Apply filters
              </Button>
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Reset to defaults
              </Button>
              {filterOptionsLoading ? <span className="text-xs text-neutral-500">Loading filter options…</span> : null}
            </div>
          </CardContent>
        ) : null}
      </Card>
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

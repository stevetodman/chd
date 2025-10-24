import { type ChangeEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageState from "../components/PageState";
import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { usePracticeSession } from "../hooks/usePracticeSession";

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
    setFilters,
    resetFilters,
    filterOptions,
    filtersLoading,
    restart
  } = usePracticeSession();
  const navigate = useNavigate();

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

  const canAdvance =
    !!currentQuestion &&
    !loading &&
    !((!hasMore && index >= questions.length - 1) || questions.length === 0);

  const isFiltering =
    filters.topic !== "all" || filters.lesion !== "all" || filters.difficulty !== "all";

  const handleTopicChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters({ topic: value === "all" ? "all" : value });
  };

  const handleLesionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters({ lesion: value === "all" ? "all" : value });
  };

  const handleDifficultyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters({ difficulty: value === "all" ? "all" : Number(value) });
  };

  const formatDifficulty = (level: number) => {
    switch (level) {
      case 1:
        return "1 – Intro";
      case 2:
        return "2 – Easy";
      case 3:
        return "3 – Moderate";
      case 4:
        return "4 – Hard";
      case 5:
        return "5 – Expert";
      default:
        return `Level ${level}`;
    }
  };

  useEffect(() => {
    if (!currentQuestion) return;
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
  }, [canAdvance, currentQuestion, next]);

  const renderFilters = () => (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm" aria-label="Practice filters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Filters</h2>
          <p className="text-xs text-neutral-500">Tailor the next set of questions to focus your practice.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={resetFilters}
          disabled={!isFiltering || filtersLoading}
        >
          Clear filters
        </Button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col text-sm font-medium text-neutral-700">
          <span>Topic</span>
          <select
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-neutral-100"
            value={filters.topic}
            onChange={handleTopicChange}
            disabled={filtersLoading && filterOptions.topics.length === 0}
          >
            <option value="all">All topics</option>
            {filterOptions.topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium text-neutral-700">
          <span>Lesion</span>
          <select
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-neutral-100"
            value={filters.lesion}
            onChange={handleLesionChange}
            disabled={filtersLoading && filterOptions.lesions.length === 0}
          >
            <option value="all">All lesions</option>
            {filterOptions.lesions.map((lesion) => (
              <option key={lesion} value={lesion}>
                {lesion}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium text-neutral-700">
          <span>Target difficulty</span>
          <select
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-neutral-100"
            value={filters.difficulty}
            onChange={handleDifficultyChange}
            disabled={filtersLoading && filterOptions.difficulties.length === 0}
          >
            <option value="all">All levels</option>
            {filterOptions.difficulties.map((level) => (
              <option key={level} value={level}>
                {formatDifficulty(level)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtersLoading ? (
        <p className="mt-3 text-xs text-neutral-500">Loading filter options…</p>
      ) : null}
    </section>
  );

  const renderEmptyState = () => (
    <PageState
      title="No questions found"
      description="Try broadening your filters or start a fresh session to explore more questions."
      variant="empty"
      fullHeight
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={resetFilters}
            disabled={!isFiltering || filtersLoading}
          >
            Clear filters
          </Button>
          <Button type="button" onClick={restart} disabled={loading}>
            Start new session
          </Button>
        </div>
      }
    />
  );

  return (
    <div className="space-y-6">
      {renderFilters()}
      {currentQuestion ? (
        <>
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            onFlagChange={handleFlagChange}
            initialFlagged={currentResponse?.flagged ?? false}
          />
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            <div>
              Q {index + 1} of {questions.length}
            </div>
            <Button type="button" onClick={next} aria-keyshortcuts="n" disabled={!canAdvance}>
              Next question
            </Button>
          </div>
        </>
      ) : (
        renderEmptyState()
      )}
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
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={restart} disabled={loading}>
                Start a new session
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/review")}>
                See flagged items
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

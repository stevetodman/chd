import { Link } from "react-router-dom";
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
    sessionComplete
  } = usePracticeSession();

  if (loading && questions.length === 0) {
    return <div>Loading questions…</div>;
  }

  if (error && questions.length === 0) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!currentQuestion) return <div>No questions found.</div>;

  return (
    <div className="space-y-6">
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
        <Button
          type="button"
          onClick={next}
          aria-keyshortcuts="n"
          disabled={(!hasMore && index >= questions.length - 1) || questions.length === 0}
        >
          Next question
        </Button>
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

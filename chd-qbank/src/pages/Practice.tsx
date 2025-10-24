import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { usePracticeSession } from "../hooks/usePracticeSession";

function PracticeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>
        <div className="flex gap-3 border-t border-neutral-100 p-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

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
    handleFlagChange
  } = usePracticeSession();

  if (loading && questions.length === 0) {
    return <PracticeSkeleton />;
  }

  if (error && questions.length === 0) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!currentQuestion) return <div>No questions found.</div>;

  return (
    <div className="space-y-6">
      <QuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        onFlagChange={handleFlagChange}
        initialFlagged={currentResponse?.flagged ?? false}
        response={{
          choiceId: currentResponse?.choice_id ?? null,
          msToAnswer: currentResponse?.ms_to_answer ?? null
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
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
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

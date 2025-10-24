import QuestionCard from "../components/QuestionCard";
import PracticeCompletionSummary from "../components/PracticeCompletionSummary";
import { Button } from "../components/ui/Button";
import { usePracticeSession } from "../hooks/usePracticeSession";

export default function Practice() {
  const {
    questions,
    currentQuestion,
    currentResponse,
    index,
    loading,
    error,
    next,
    handleAnswer,
    handleFlagChange,
    completed,
    summary,
    restart
  } = usePracticeSession();

  if (loading && questions.length === 0) {
    return <div>Loading questions…</div>;
  }

  if (error && questions.length === 0) {
    return <div className="text-red-600">{error}</div>;
  }

  if (completed) {
    return <PracticeCompletionSummary summary={summary} onRestart={() => void restart()} />;
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
          disabled={questions.length === 0}
        >
          Next question
        </Button>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

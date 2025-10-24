import { useMemo } from "react";
import QuestionCard from "../components/QuestionCard";
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
    hasMore,
    next,
    handleAnswer,
    handleFlagChange,
    topicFilter,
    subtopicFilter,
    setTopicFilter,
    setSubtopicFilter
  } = usePracticeSession();

  const topicOptions = useMemo(() => {
    const values = new Set<string>();
    questions.forEach((question) => {
      const topic = question.topic;
      if (topic && topic.trim().length > 0) {
        values.add(topic);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const subtopicOptions = useMemo(() => {
    const values = new Set<string>();
    questions.forEach((question) => {
      if (topicFilter && question.topic !== topicFilter) {
        return;
      }
      const subtopic = question.subtopic;
      if (subtopic && subtopic.trim().length > 0) {
        values.add(subtopic);
      }
    });

    if (!topicFilter && values.size === 0) {
      questions.forEach((question) => {
        const subtopic = question.subtopic;
        if (subtopic && subtopic.trim().length > 0) {
          values.add(subtopic);
        }
      });
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [questions, topicFilter]);

  const showLoading = loading && questions.length === 0;
  const showInitialError = Boolean(error) && questions.length === 0 && !loading;
  const noQuestions = !currentQuestion && !showLoading && !showInitialError;

  const filterControls = (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex min-w-[200px] flex-col gap-1 text-sm font-medium text-neutral-700">
          Topic
          <select
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={topicFilter}
            onChange={(event) => setTopicFilter(event.target.value)}
          >
            <option value="">All topics</option>
            {topicOptions.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-col gap-1 text-sm font-medium text-neutral-700">
          Subtopic
          <select
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={subtopicFilter}
            onChange={(event) => setSubtopicFilter(event.target.value)}
            disabled={subtopicOptions.length === 0 && !subtopicFilter}
          >
            <option value="">All subtopics</option>
            {subtopicOptions.map((subtopic) => (
              <option key={subtopic} value={subtopic}>
                {subtopic}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {filterControls}

      {showLoading ? <div>Loading questions…</div> : null}
      {showInitialError ? <div className="text-red-600">{error}</div> : null}

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
            <Button
              type="button"
              onClick={next}
              aria-keyshortcuts="n"
              disabled={(!hasMore && index >= questions.length - 1) || questions.length === 0}
            >
              Next question
            </Button>
          </div>
        </>
      ) : null}

      {noQuestions ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          No questions found. Try adjusting your filters.
        </div>
      ) : null}

      {error && questions.length > 0 ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import { usePracticeSession, type PracticeFilters } from "../hooks/usePracticeSession";
import { supabase } from "../lib/supabaseClient";

type TopicOption = { topic: string };

const difficultyOptions = [
  { value: "", label: "All difficulties" },
  { value: "easy", label: "Easy" },
  { value: "med", label: "Medium" },
  { value: "hard", label: "Hard" }
];

export default function Practice() {
  const [filters, setFilters] = useState<PracticeFilters>({});
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
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
  } = usePracticeSession(filters);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    setTopicsError(null);

    const { data, error } = await supabase
      .from("questions")
      .select("topic")
      .eq("status", "published")
      .not("topic", "is", null)
      .order("topic", { ascending: true });

    if (error) {
      setTopicsError("We couldn't load topics. Try again later.");
      setTopicsLoading(false);
      return;
    }

    const uniqueTopics = Array.from(
      new Set(
        ((data ?? []) as TopicOption[])
          .map((row) => row.topic?.trim())
          .filter((topic): topic is string => Boolean(topic))
      )
    ).sort((a, b) => a.localeCompare(b));

    setTopicOptions(uniqueTopics);
    setTopicsLoading(false);
  }, []);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  const hasActiveFilters = useMemo(
    () => Boolean(filters.topic || filters.difficulty),
    [filters.difficulty, filters.topic]
  );

  const handleFilterChange = (key: keyof PracticeFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value ? value : null
    }));
  };

  const resetFilters = () => {
    setFilters({});
  };

  if (loading && questions.length === 0) {
    return <div>Loading questions…</div>;
  }

  if (error && questions.length === 0) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!currentQuestion) return <div>No questions found.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-neutral-900">
              Topic
              <select
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={filters.topic ?? ""}
                onChange={(event) => handleFilterChange("topic", event.target.value)}
                disabled={topicsLoading}
              >
                <option value="">All topics</option>
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-neutral-900">
              Difficulty
              <select
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={filters.difficulty ?? ""}
                onChange={(event) => handleFilterChange("difficulty", event.target.value)}
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={resetFilters}
              disabled={!hasActiveFilters && !topicsError}
            >
              Clear filters
            </Button>
          </div>
        </div>
        {topicsLoading ? (
          <p className="mt-3 text-sm text-neutral-600">Loading topics…</p>
        ) : null}
        {topicsError ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-red-600">
            <span>{topicsError}</span>
            <Button type="button" variant="ghost" onClick={() => void loadTopics()}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
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
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

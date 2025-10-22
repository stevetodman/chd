import { useCallback, useEffect, useRef, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import type { Choice } from "../lib/constants";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { useSessionStore } from "../lib/auth";
import {
  fetchPracticeQuestions,
  submitPracticeAnswer,
  type QuestionRow
} from "../lib/practiceFlow";

const PAGE_SIZE = 10;

export default function Practice() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const questionsRef = useRef<QuestionRow[]>([]);
  const loadingRef = useRef(false);
  const loadedPages = useRef(new Set<number>());
  const { session } = useSessionStore();

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const loadPage = useCallback(
    async (pageToLoad: number, replace = false) => {
      if (loadingRef.current && !replace) return 0;
      if (!replace && loadedPages.current.has(pageToLoad)) return 0;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      let fetched: QuestionRow[] = [];
      let totalCount: number | undefined;
      try {
        const result = await fetchPracticeQuestions(supabase, pageToLoad, PAGE_SIZE);
        fetched = result.questions;
        totalCount = result.count;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
        setLoading(false);
        loadingRef.current = false;
        return 0;
      }

      let nextQuestions: QuestionRow[] = [];
      setQuestions((prev) => {
        const base = replace ? [] : prev;
        const map = new Map(base.map((question) => [question.id, question]));
        fetched.forEach((question) => {
          map.set(question.id, question);
        });
        nextQuestions = Array.from(map.values());
        return nextQuestions;
      });

      questionsRef.current = nextQuestions;

      if (replace) {
        loadedPages.current = new Set([pageToLoad]);
        setIndex(0);
      } else {
        loadedPages.current.add(pageToLoad);
      }

      setPage(pageToLoad);
      if (typeof totalCount === "number") {
        setHasMore(nextQuestions.length < totalCount);
      } else {
        setHasMore(fetched.length === PAGE_SIZE);
      }

      setLoading(false);
      loadingRef.current = false;
      return fetched.length;
    },
    []
  );

  useEffect(() => {
    void loadPage(0, true);
  }, [loadPage]);

  useEffect(() => {
    if (questions.length === 0) return;
    if (!hasMore) return;
    if (index < questions.length - 2) return;
    void loadPage(page + 1);
  }, [index, questions.length, hasMore, loadPage, page]);

  const handleAnswer = async (choice: Choice, ms: number, flagged: boolean) => {
    const current = questions[index];
    if (!current || !session) return;
    await submitPracticeAnswer({
      client: supabase,
      userId: session.user.id,
      questionId: current.id,
      choice,
      durationMs: ms,
      flagged
    }).catch(() => {
      // Errors are logged in submitPracticeAnswer. We keep the UI responsive.
    });
  };

  const next = () => {
    const nextIndex = index + 1;
    if (nextIndex < questions.length) {
      setIndex(nextIndex);
      return;
    }

    if (hasMore) {
      void loadPage(page + 1).then((loaded) => {
        if (loaded > 0) {
          setIndex((prev) => {
            const total = questionsRef.current.length;
            if (total === 0) return prev;
            return Math.min(prev + 1, total - 1);
          });
        }
      });
    }
  };

  const current = questions[index];

  if (loading && questions.length === 0) {
    return <div>Loading questions…</div>;
  }

  if (error && questions.length === 0) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!current) return <div>No questions found.</div>;

  return (
    <div className="space-y-6">
      <QuestionCard question={current} onAnswer={handleAnswer} />
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        <div>
          Q {index + 1} of {questions.length}
        </div>
        <Button type="button" onClick={next} aria-keyshortcuts="n" disabled={(loading && index >= questions.length - 1) || questions.length === 0}>
          Next question
        </Button>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

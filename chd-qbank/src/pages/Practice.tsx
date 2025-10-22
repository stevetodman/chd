import { useCallback, useEffect, useRef, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import type { Choice } from "../lib/constants";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { useSessionStore } from "../lib/auth";
import {
  determineHasMore,
  mergeQuestionPages,
  normalizeQuestionRows,
  PRACTICE_PAGE_SIZE,
  QuestionRow,
  QuestionQueryRow,
  shuffleQuestions,
  shouldLoadNextPage
} from "../lib/practice";

type PracticeResponse = {
  id: string;
  flagged: boolean;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
};

const mapResponse = (data: {
  id: string;
  flagged: boolean;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
}): PracticeResponse => ({
  id: data.id,
  flagged: data.flagged,
  choice_id: data.choice_id,
  is_correct: data.is_correct,
  ms_to_answer: data.ms_to_answer
});

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
  const [responses, setResponses] = useState<Record<string, PracticeResponse | null>>({});
  const responsesRef = useRef<Record<string, PracticeResponse | null>>({});
  const { session } = useSessionStore();

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  const loadPage = useCallback(
    async (pageToLoad: number, replace = false) => {
      if (loadingRef.current && !replace) return 0;
      if (!replace && loadedPages.current.has(pageToLoad)) return 0;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const from = pageToLoad * PRACTICE_PAGE_SIZE;
      const to = from + PRACTICE_PAGE_SIZE - 1;
      const { data, error: fetchError, count } = await supabase
        .from("questions")
        .select(
          "id, slug, stem_md, lead_in, explanation_brief_md, explanation_deep_md, topic, subtopic, lesion, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id,label,text_md,is_correct)",
          { count: "exact" }
        )
        .eq("status", "published")
        .order("id", { ascending: true })
        .range(from, to);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        loadingRef.current = false;
        return 0;
      }

      const normalized = normalizeQuestionRows((data ?? []) as QuestionQueryRow[]);

      const randomized = shuffleQuestions(normalized);

      let nextQuestions: QuestionRow[] = [];
      setQuestions((prev) => {
        const base = replace ? [] : prev;
        nextQuestions = mergeQuestionPages(base, randomized);
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
      setHasMore(determineHasMore(count, nextQuestions.length, normalized.length));

      setLoading(false);
      loadingRef.current = false;
      return randomized.length;
    },
    []
  );

  useEffect(() => {
    void loadPage(0, true);
  }, [loadPage]);

  useEffect(() => {
    if (!shouldLoadNextPage(index, questions.length, hasMore)) return;
    void loadPage(page + 1);
  }, [index, questions.length, hasMore, loadPage, page]);

  const handleAnswer = async (choice: Choice, ms: number, flagged: boolean) => {
    const current = questions[index];
    if (!current) return;

    if (!session) {
      setError("You must be signed in to save your progress.");
      throw new Error("Missing session");
    }

    const fail = (message: string): never => {
      setError(message);
      throw new Error(message);
    };

    let existing = responses[current.id];
    if (!existing) {
      const { data, error } = await supabase
        .from("responses")
        .select("id, flagged, choice_id, is_correct, ms_to_answer")
        .eq("user_id", session.user.id)
        .eq("question_id", current.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        fail("We couldn't load your previous response. Check your connection and try again.");
      }

      if (data) {
        existing = mapResponse(data);
        setResponses((prev) => ({
          ...prev,
          [current.id]: existing
        }));
      }
    }

    let saved: PracticeResponse | null = null;

    if (existing) {
      const { data, error } = await supabase
        .from("responses")
        .update({
          choice_id: choice.id,
          is_correct: choice.is_correct,
          ms_to_answer: ms,
          flagged
        })
        .eq("id", existing.id)
        .select("id, flagged, choice_id, is_correct, ms_to_answer")
        .maybeSingle();

      if (error || !data) {
        fail("We couldn't update your response. Please try again.");
      }

      saved = mapResponse(data);
    } else {
      const { data, error } = await supabase
        .from("responses")
        .insert({
          user_id: session.user.id,
          question_id: current.id,
          choice_id: choice.id,
          is_correct: choice.is_correct,
          ms_to_answer: ms,
          flagged
        })
        .select("id, flagged, choice_id, is_correct, ms_to_answer")
        .single();

      if (error || !data) {
        fail("We couldn't submit your response. Please check your connection and try again.");
      }

      saved = mapResponse(data);
    }

    setResponses((prev) => ({
      ...prev,
      [current.id]: saved
    }));

    if (choice.is_correct) {
      const { error: rpcError } = await supabase.rpc("increment_points", { delta: 1 });
      if (rpcError) {
        setError("Your answer was saved, but we couldn't update your points. Please try again later.");
        return;
      }
    }

    setError(null);
  };

  const handleFlagChange = useCallback(
    async (flagged: boolean) => {
      const current = questionsRef.current[index];
      if (!current || !session) return;
      const existing = responsesRef.current[current.id];
      const fail = (message: string): never => {
        setError(message);
        throw new Error(message);
      };

      if (existing) {
        const { data, error } = await supabase
          .from("responses")
          .update({ flagged })
          .eq("id", existing.id)
          .select("id, flagged, choice_id, is_correct, ms_to_answer")
          .maybeSingle();

        if (error || !data) {
          fail("We couldn't update the flag. Please try again.");
        }

        setResponses((prev) => ({
          ...prev,
          [current.id]: mapResponse(data)
        }));
      } else {
        const { data, error } = await supabase
          .from("responses")
          .insert({
            user_id: session.user.id,
            question_id: current.id,
            flagged,
            choice_id: null,
            is_correct: false,
            ms_to_answer: null
          })
          .select("id, flagged, choice_id, is_correct, ms_to_answer")
          .single();

        if (error || !data) {
          fail("We couldn't save the flag. Please check your connection and try again.");
        }

        setResponses((prev) => ({
          ...prev,
          [current.id]: mapResponse(data)
        }));
      }

      setError(null);
    },
    [index, session]
  );

  useEffect(() => {
    const currentQuestion = questions[index];
    if (!currentQuestion || !session) return;
    if (currentQuestion.id in responsesRef.current) return;

    void supabase
      .from("responses")
      .select("id, flagged, choice_id, is_correct, ms_to_answer")
      .eq("user_id", session.user.id)
      .eq("question_id", currentQuestion.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
        setResponses((prev) => ({
          ...prev,
          [currentQuestion.id]: data ? mapResponse(data) : null
        }));
      });
  }, [index, questions, session]);

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
      <QuestionCard
        question={current}
        onAnswer={handleAnswer}
        onFlagChange={handleFlagChange}
        initialFlagged={responses[current.id]?.flagged ?? false}
      />
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

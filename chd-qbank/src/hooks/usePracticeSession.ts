import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Choice } from "../lib/constants";
import { useSessionStore } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";
import {
  determineHasMore,
  mergeQuestionPages,
  normalizeQuestionRows,
  PRACTICE_PAGE_SIZE,
  type QuestionQueryRow,
  type QuestionRow,
  shuffleQuestions,
  shouldLoadNextPage
} from "../lib/practice";

export type PracticeResponse = {
  id: string;
  flagged: boolean;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
};

type ResponseMap = Record<string, PracticeResponse | null>;

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

export function usePracticeSession() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const questionsRef = useRef<QuestionRow[]>([]);
  const loadingRef = useRef(false);
  const loadedPages = useRef(new Set<number>());
  const [responses, setResponses] = useState<ResponseMap>({});
  const responsesRef = useRef<ResponseMap>({});
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

      const base = replace ? [] : questionsRef.current;
      const nextQuestions = mergeQuestionPages(base, randomized);
      setQuestions(nextQuestions);
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

  const handleAnswer = useCallback(
    async (choice: Choice, ms: number, flagged: boolean) => {
      const current = questionsRef.current[index];
      if (!current) return;

      if (!session) {
        setError("You must be signed in to save your progress.");
        throw new Error("Missing session");
      }

      const fail = (message: string): never => {
        setError(message);
        throw new Error(message);
      };

      let existing = responsesRef.current[current.id];
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
      const wasCorrect = existing?.is_correct ?? false;

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

      if (saved?.is_correct && !wasCorrect) {
        const { error: rpcError } = await supabase.rpc("increment_points", {
          source: "practice_response",
          source_id: saved.id
        });
        if (rpcError) {
          setError("Your answer was saved, but we couldn't update your points. Please try again later.");
          return;
        }
      }

      setError(null);
    },
    [index, session]
  );

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

  const next = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex < questionsRef.current.length) {
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
  }, [hasMore, index, loadPage, page]);

  const currentQuestion = questions[index] ?? null;
  const currentResponse = useMemo(() => {
    if (!currentQuestion) return null;
    return responses[currentQuestion.id] ?? null;
  }, [currentQuestion, responses]);

  return {
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
  } as const;
}

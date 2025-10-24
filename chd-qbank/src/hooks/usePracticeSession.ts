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

type ResponseRow = {
  id: string;
  question_id?: string;
  flagged: boolean;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer: number | null;
};

type ResponseMap = Record<string, PracticeResponse | null>;

const mapResponse = (data: ResponseRow): PracticeResponse => ({
  id: data.id,
  flagged: data.flagged,
  choice_id: data.choice_id,
  is_correct: data.is_correct,
  ms_to_answer: data.ms_to_answer
});

export type PracticeSessionStats = {
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number | null;
  averageMs: number | null;
  flagged: number;
};

export type PracticeFilters = {
  topic: string | "all";
  lesion: string | "all";
  difficulty: number | "all";
};

export type PracticeFilterOptions = {
  topics: string[];
  lesions: string[];
  difficulties: number[];
};

const DEFAULT_FILTERS: PracticeFilters = {
  topic: "all",
  lesion: "all",
  difficulty: "all"
};

const filtersAreEqual = (a: PracticeFilters, b: PracticeFilters) =>
  a.topic === b.topic && a.lesion === b.lesion && a.difficulty === b.difficulty;

export function usePracticeSession() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const questionsRef = useRef<QuestionRow[]>([]);
  const loadingRef = useRef(false);
  const inFlightRequests = useRef(0);
  const loadedPages = useRef(new Set<number>());
  const [responses, setResponses] = useState<ResponseMap>({});
  const responsesRef = useRef<ResponseMap>({});
  const filterVersionRef = useRef(0);
  const [filters, setFiltersState] = useState<PracticeFilters>(() => ({ ...DEFAULT_FILTERS }));
  const filtersRef = useRef<PracticeFilters>({ ...DEFAULT_FILTERS });
  const [filterOptions, setFilterOptions] = useState<PracticeFilterOptions>({
    topics: [],
    lesions: [],
    difficulties: []
  });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const { session } = useSessionStore();

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setFiltersLoading(true);

    const loadOptions = async () => {
      try {
        const [topicsResult, lesionsResult, difficultiesResult] = await Promise.all([
          supabase
            .from("questions")
            .select("topic", { distinct: true })
            .not("topic", "is", null),
          supabase
            .from("questions")
            .select("lesion", { distinct: true })
            .not("lesion", "is", null),
          supabase
            .from("questions")
            .select("difficulty_target", { distinct: true })
            .not("difficulty_target", "is", null)
        ]);

        if (cancelled) return;

        const nextOptions: PracticeFilterOptions = {
          topics: [],
          lesions: [],
          difficulties: []
        };

        if (!topicsResult.error && topicsResult.data) {
          nextOptions.topics = (topicsResult.data as Array<{ topic: string | null }>).
            map((row) => row.topic).
            filter((value): value is string => typeof value === "string" && value.trim().length > 0).
            sort((a, b) => a.localeCompare(b));
        }

        if (!lesionsResult.error && lesionsResult.data) {
          nextOptions.lesions = (lesionsResult.data as Array<{ lesion: string | null }>).
            map((row) => row.lesion).
            filter((value): value is string => typeof value === "string" && value.trim().length > 0).
            sort((a, b) => a.localeCompare(b));
        }

        if (!difficultiesResult.error && difficultiesResult.data) {
          nextOptions.difficulties = (difficultiesResult.data as Array<{ difficulty_target: number | null }>).
            map((row) => row.difficulty_target).
            filter((value): value is number => typeof value === "number").
            sort((a, b) => a - b);
        }

        setFilterOptions(nextOptions);
      } catch {
        if (cancelled) return;
        setFilterOptions({ topics: [], lesions: [], difficulties: [] });
      } finally {
        if (cancelled) return;
        setFiltersLoading(false);
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadPage = useCallback(
    async (pageToLoad: number, replace = false) => {
      if (loadingRef.current && !replace) return 0;
      if (!replace && loadedPages.current.has(pageToLoad)) return 0;

      const requestVersion = replace ? filterVersionRef.current + 1 : filterVersionRef.current;
      if (replace) {
        filterVersionRef.current = requestVersion;
        loadedPages.current = new Set();
        questionsRef.current = [];
        setQuestions([]);
        responsesRef.current = {};
        setResponses({});
        setIndex(0);
        setHasMore(true);
      }

      inFlightRequests.current += 1;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const from = pageToLoad * PRACTICE_PAGE_SIZE;
      const to = from + PRACTICE_PAGE_SIZE - 1;

      try {
        const activeFilters = filtersRef.current;

        let query = supabase
          .from("questions")
          .select(
            "id, slug, stem_md, lead_in, explanation_brief_md, explanation_deep_md, topic, subtopic, lesion, difficulty_target, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id,label,text_md,is_correct)",
            { count: "exact" }
          )
          .eq("status", "published")
          .order("id", { ascending: true })
          .range(from, to);

        if (activeFilters.topic !== "all") {
          query = query.eq("topic", activeFilters.topic);
        }

        if (activeFilters.lesion !== "all") {
          query = query.eq("lesion", activeFilters.lesion);
        }

        if (activeFilters.difficulty !== "all") {
          query = query.eq("difficulty_target", activeFilters.difficulty);
        }

        const { data, error: fetchError, count } = await query;

        if (requestVersion !== filterVersionRef.current) {
          return 0;
        }

        if (fetchError) {
          setError(fetchError.message);
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

        if (session) {
          const questionIds = randomized.map((question) => question.id);
          if (replace && questionIds.length === 0) {
            setResponses({});
            responsesRef.current = {};
          }

          if (questionIds.length > 0) {
            if (requestVersion !== filterVersionRef.current) {
              return randomized.length;
            }

            setResponses((prev) => {
              const base: ResponseMap = replace ? {} : { ...prev };
              for (const id of questionIds) {
                if (!(id in base)) {
                  base[id] = null;
                }
              }

              responsesRef.current = base;
              return base;
            });

            const { data: responseRows, error: responsesError } = await supabase
              .from("responses")
              .select("id, flagged, choice_id, is_correct, ms_to_answer, question_id")
              .eq("user_id", session.user.id)
              .in("question_id", questionIds);

            if (requestVersion !== filterVersionRef.current) {
              return randomized.length;
            }

            if (!responsesError) {
              const typedRows = (responseRows ?? []) as ResponseRow[];
              if (typedRows.length > 0) {
                setResponses((prev) => {
                  const base: ResponseMap = { ...prev };

                  for (const row of typedRows) {
                    if (!row.question_id) continue;
                    base[row.question_id] = mapResponse(row);
                  }

                  responsesRef.current = base;
                  return base;
                });
              }
            }
          }
        } else if (replace) {
          setResponses({});
          responsesRef.current = {};
        }

        return randomized.length;
      } finally {
        inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
        const stillLoading = inFlightRequests.current > 0;
        loadingRef.current = stillLoading;
        setLoading(stillLoading);
      }
    },
    [session]
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

      const existing = responsesRef.current[current.id] ?? null;
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

  const sessionStats = useMemo<PracticeSessionStats>(() => {
    const values = Object.values(responses);
    const base = values.reduce(
      (
        acc,
        response
      ) => {
        if (!response) return acc;
        if (response.flagged) acc.flagged += 1;
        if (response.choice_id) {
          acc.totalAnswered += 1;
          if (response.is_correct) acc.totalCorrect += 1;
          if (typeof response.ms_to_answer === "number") {
            acc.totalMs += response.ms_to_answer;
            acc.timedCount += 1;
          }
        }
        return acc;
      },
      { totalAnswered: 0, totalCorrect: 0, flagged: 0, totalMs: 0, timedCount: 0 }
    );

    return {
      totalAnswered: base.totalAnswered,
      totalCorrect: base.totalCorrect,
      accuracy: base.totalAnswered ? base.totalCorrect / base.totalAnswered : null,
      averageMs: base.timedCount ? Math.round(base.totalMs / base.timedCount) : null,
      flagged: base.flagged
    } satisfies PracticeSessionStats;
  }, [responses]);

  const sessionComplete = useMemo(
    () => !hasMore && questions.length > 0 && index >= questions.length - 1 && sessionStats.totalAnswered > 0,
    [hasMore, index, questions.length, sessionStats.totalAnswered]
  );

  const updateFilters = useCallback(
    (updates: Partial<PracticeFilters>) => {
      const current = filtersRef.current;
      const next = { ...current, ...updates };
      if (filtersAreEqual(current, next)) {
        setError(null);
        return;
      }

      filtersRef.current = next;
      setFiltersState(next);
      setError(null);
      void loadPage(0, true);
    },
    [loadPage]
  );

  const resetFilters = useCallback(() => {
    const current = filtersRef.current;
    if (filtersAreEqual(current, DEFAULT_FILTERS)) {
      setError(null);
      return;
    }

    const next = { ...DEFAULT_FILTERS };
    filtersRef.current = next;
    setFiltersState(next);
    setError(null);
    void loadPage(0, true);
  }, [loadPage]);

  const restart = useCallback(() => {
    setQuestions([]);
    questionsRef.current = [];
    setResponses({});
    responsesRef.current = {};
    setHasMore(true);
    loadedPages.current = new Set();
    setIndex(0);
    setError(null);
    void loadPage(0, true);
  }, [loadPage]);

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
    handleFlagChange,
    sessionStats,
    sessionComplete,
    filters,
    setFilters: updateFilters,
    resetFilters,
    filterOptions,
    filtersLoading,
    restart
  } as const;
}

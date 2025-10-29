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
  currentStreak: number;
  longestStreak: number;
};

export type PracticeFilters = {
  topic: string | null;
  lesion: string | null;
  flagged: "all" | "flagged";
  status: "all" | "new" | "seen";
  sessionLength: number;
};

export const DEFAULT_PRACTICE_FILTERS: PracticeFilters = {
  topic: null,
  lesion: null,
  flagged: "all",
  status: "all",
  sessionLength: PRACTICE_PAGE_SIZE
};

export type PracticeFilterOptions = {
  topics: string[];
  lesions: string[];
};

const formatNotIn = (values: string[]): string => `(${values.map((value) => `'${value}'`).join(",")})`;

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
  const updateResponses = useCallback((updater: (current: ResponseMap) => ResponseMap) => {
    setResponses((prev) => {
      const next = updater(prev);
      responsesRef.current = next;
      return next;
    });
  }, []);
  const responsesRef = useRef<ResponseMap>({});
  const filterVersionRef = useRef(0);
  const [filters, setFilters] = useState<PracticeFilters>({ ...DEFAULT_PRACTICE_FILTERS });
  const filtersRef = useRef<PracticeFilters>({ ...DEFAULT_PRACTICE_FILTERS });
  const filterFieldSnapshotRef = useRef({
    topic: DEFAULT_PRACTICE_FILTERS.topic,
    lesion: DEFAULT_PRACTICE_FILTERS.lesion,
    sessionLength: DEFAULT_PRACTICE_FILTERS.sessionLength
  });
  const [filterOptions, setFilterOptions] = useState<PracticeFilterOptions>({ topics: [], lesions: [] });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const flaggedIdsRef = useRef<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [flaggedVersion, setFlaggedVersion] = useState(0);
  const [seenVersion, setSeenVersion] = useState(0);
  const { session } = useSessionStore();

  const syncSetsFromResponses = useCallback(
    (rows: ResponseRow[]) => {
      if (rows.length === 0) return;
      let flaggedChanged = false;
      let seenChanged = false;
      const flagged = new Set(flaggedIdsRef.current);
      const seen = new Set(seenIdsRef.current);

      for (const row of rows) {
        if (!row.question_id) continue;
        if (row.flagged) {
          if (!flagged.has(row.question_id)) {
            flagged.add(row.question_id);
            flaggedChanged = true;
          }
        } else if (flagged.delete(row.question_id)) {
          flaggedChanged = true;
        }

        if (row.choice_id) {
          if (!seen.has(row.question_id)) {
            seen.add(row.question_id);
            seenChanged = true;
          }
        }
      }

      if (flaggedChanged) {
        flaggedIdsRef.current = flagged;
        setFlaggedVersion((version) => version + 1);
      }
      if (seenChanged) {
        seenIdsRef.current = seen;
        setSeenVersion((version) => version + 1);
      }
    },
    []
  );

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
    let active = true;
    setFilterOptionsLoading(true);
    setFilterOptionsError(null);

    const loadFilterOptions = async () => {
      try {
        const [topicsResult, lesionsResult] = await Promise.all([
          supabase
            .from("questions")
            .select("topic", { distinct: true })
            .eq("status", "published"),
          supabase
            .from("questions")
            .select("lesion", { distinct: true })
            .eq("status", "published")
        ]);

        if (!active) return;

        if (topicsResult.error || lesionsResult.error) {
          setFilterOptions({ topics: [], lesions: [] });
          setFilterOptionsError("We couldn't load filter options. Try again later.");
          return;
        }

        const topics = (topicsResult.data ?? [])
          .map((row) => (row.topic ?? "").trim())
          .filter((value) => value.length > 0);
        const lesions = (lesionsResult.data ?? [])
          .map((row) => (row.lesion ?? "").trim())
          .filter((value) => value.length > 0);

        setFilterOptions({
          topics: Array.from(new Set(topics)).sort((a, b) => a.localeCompare(b)),
          lesions: Array.from(new Set(lesions)).sort((a, b) => a.localeCompare(b))
        });
      } catch {
        if (!active) return;
        setFilterOptions({ topics: [], lesions: [] });
        setFilterOptionsError("We couldn't load filter options. Try again later.");
      } finally {
        if (active) {
          setFilterOptionsLoading(false);
        }
      }
    };

    void loadFilterOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      flaggedIdsRef.current = new Set();
      seenIdsRef.current = new Set();
      updateResponses(() => ({}));
      setFlaggedVersion((version) => version + 1);
      setSeenVersion((version) => version + 1);
      return;
    }

    let active = true;

    supabase
      .from("responses")
      .select("id, question_id, flagged, choice_id, is_correct, ms_to_answer")
      .eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          return;
        }

        const flagged = new Set<string>();
        const seen = new Set<string>();
        const map: ResponseMap = {};

        for (const row of data ?? []) {
          if (!row?.question_id) continue;
          if (row.flagged) flagged.add(row.question_id);
          if (row.choice_id) seen.add(row.question_id);
          map[row.question_id] = mapResponse(row as ResponseRow);
        }

        flaggedIdsRef.current = flagged;
        seenIdsRef.current = seen;
        updateResponses(() => map);
        syncSetsFromResponses((data ?? []) as ResponseRow[]);
        setFlaggedVersion((version) => version + 1);
        setSeenVersion((version) => version + 1);
      });

    return () => {
      active = false;
    };
  }, [session, syncSetsFromResponses, updateResponses]);

  const updateFlaggedSet = useCallback((questionId: string, isFlagged: boolean) => {
    const next = new Set(flaggedIdsRef.current);
    const hadValue = next.has(questionId);
    if (isFlagged) {
      next.add(questionId);
    } else {
      next.delete(questionId);
    }
    const changed = hadValue !== next.has(questionId);
    flaggedIdsRef.current = next;
    if (changed) {
      setFlaggedVersion((version) => version + 1);
    }
  }, []);

  const markQuestionSeen = useCallback((questionId: string) => {
    if (seenIdsRef.current.has(questionId)) return;
    const next = new Set(seenIdsRef.current);
    next.add(questionId);
    seenIdsRef.current = next;
    setSeenVersion((version) => version + 1);
  }, []);

  const loadPage = useCallback(
    async (pageToLoad: number, replace = false) => {
      if (loadingRef.current && !replace) return 0;
      if (!replace && loadedPages.current.has(pageToLoad)) return 0;

      const requestVersion = replace ? filterVersionRef.current + 1 : filterVersionRef.current;
      if (replace) {
        filterVersionRef.current = requestVersion;
      }

      const activeFilters = filtersRef.current;
      const flaggedOnly = activeFilters.flagged === "flagged";
      const seenFilter = activeFilters.status;
      const flaggedIds = Array.from(flaggedIdsRef.current);
      const seenIds = Array.from(seenIdsRef.current);

      if (flaggedOnly && flaggedIds.length === 0) {
        setQuestions([]);
        setHasMore(false);
        setPage(0);
        setIndex(0);
        updateResponses(() => ({}));
        loadingRef.current = false;
        setLoading(false);
        return 0;
      }

      if (seenFilter === "seen" && seenIds.length === 0) {
        setQuestions([]);
        setHasMore(false);
        setPage(0);
        setIndex(0);
        loadingRef.current = false;
        setLoading(false);
        return 0;
      }

      inFlightRequests.current += 1;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const from = pageToLoad * PRACTICE_PAGE_SIZE;
      const to = from + PRACTICE_PAGE_SIZE - 1;

      try {
        let query = supabase
          .from("questions")
          .select(
            "id, slug, stem_md, lead_in, explanation_brief_md, explanation_deep_md, topic, subtopic, lesion, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id,label,text_md,is_correct)",
            { count: "exact" }
          )
          .eq("status", "published");

        if (activeFilters.topic) {
          query = query.eq("topic", activeFilters.topic);
        }

        if (activeFilters.lesion) {
          query = query.eq("lesion", activeFilters.lesion);
        }

        if (flaggedOnly && flaggedIds.length > 0) {
          query = query.in("id", flaggedIds);
        }

        if (seenFilter === "seen" && seenIds.length > 0) {
          query = query.in("id", seenIds);
        }

        if (seenFilter === "new" && seenIds.length > 0) {
          query = query.not("id", "in", formatNotIn(seenIds));
        }

        const { data, error: fetchError, count } = await query.order("id", { ascending: true }).range(from, to);

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
        const merged = mergeQuestionPages(base, randomized);
        const targetLength = Math.max(activeFilters.sessionLength, 1);
        const limited = merged.slice(0, targetLength);
        setQuestions(limited);
        questionsRef.current = limited;

        if (replace) {
          loadedPages.current = new Set([pageToLoad]);
          setIndex(0);
        } else {
          loadedPages.current.add(pageToLoad);
        }

        setPage(pageToLoad);
        const reachedLimit = limited.length >= targetLength;
        const moreAvailable = determineHasMore(count, limited.length, normalized.length);
        setHasMore(!reachedLimit && moreAvailable);

        const questionIds = randomized.map((question) => question.id);
        if (replace && questionIds.length === 0) {
          updateResponses(() => ({}));
        } else if (questionIds.length > 0) {
          if (requestVersion !== filterVersionRef.current) {
            return randomized.length;
          }

          const existingResponses = responsesRef.current;
          updateResponses((prev) => {
            const base: ResponseMap = replace ? {} : { ...prev };
            for (const id of questionIds) {
              if (!(id in base)) {
                base[id] = existingResponses[id] ?? null;
              }
            }
            return base;
          });
        } else if (replace) {
          updateResponses(() => ({}));
        }

        return Math.max(0, limited.length - base.length);
      } finally {
        inFlightRequests.current = Math.max(0, inFlightRequests.current - 1);
        const stillLoading = inFlightRequests.current > 0;
        loadingRef.current = stillLoading;
        setLoading(stillLoading);
      }
    },
    [updateResponses]
  );

  useEffect(() => {
    void loadPage(0, true);
  }, [loadPage]);

  useEffect(() => {
    const previous = filterFieldSnapshotRef.current;
    const changed =
      previous.topic !== filters.topic ||
      previous.lesion !== filters.lesion ||
      previous.sessionLength !== filters.sessionLength;

    filterFieldSnapshotRef.current = {
      topic: filters.topic,
      lesion: filters.lesion,
      sessionLength: filters.sessionLength
    };

    if (!changed) {
      return;
    }

    void loadPage(0, true);
  }, [filters.topic, filters.lesion, filters.sessionLength, loadPage]);

  useEffect(() => {
    if (filters.flagged === "flagged") {
      void loadPage(0, true);
    }
  }, [filters.flagged, flaggedVersion, loadPage]);

  useEffect(() => {
    if (filters.status !== "all") {
      void loadPage(0, true);
    }
  }, [filters.status, seenVersion, loadPage]);

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

      updateResponses((prev) => ({
        ...prev,
        [current.id]: saved
      }));

      markQuestionSeen(current.id);
      updateFlaggedSet(current.id, saved?.flagged ?? flagged);

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
    [index, session, markQuestionSeen, updateFlaggedSet, updateResponses]
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

        updateResponses((prev) => ({
          ...prev,
          [current.id]: mapResponse(data)
        }));

      updateFlaggedSet(current.id, flagged);
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

      updateResponses((prev) => ({
        ...prev,
        [current.id]: mapResponse(data)
      }));

      updateFlaggedSet(current.id, flagged);
    }

      setError(null);
    },
    [index, session, updateFlaggedSet, updateResponses]
  );

  const reportIssue = useCallback(
    async (description: string) => {
      const current = questionsRef.current[index];
      if (!current) {
        throw new Error("We couldn't identify the current question. Please try again.");
      }

      if (!session) {
        const message = "You must be signed in to report an issue.";
        setError(message);
        throw new Error(message);
      }

      const trimmed = description.trim();
      if (!trimmed) {
        throw new Error("Tell us what needs attention before sending the report.");
      }

      const existing = responsesRef.current[current.id];

      const { error: insertError } = await supabase
        .from("question_issue_reports")
        .insert({
          user_id: session.user.id,
          question_id: current.id,
          response_id: existing?.id ?? null,
          description: trimmed
        })
        .select("id")
        .single();

      if (insertError) {
        const message = "We couldn't send your report. Please try again.";
        setError(message);
        throw new Error(message);
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
        updateResponses((prev) => ({
          ...prev,
          [currentQuestion.id]: data ? mapResponse(data) : null
        }));
        if (data) {
          syncSetsFromResponses([
            {
              id: data.id,
              question_id: currentQuestion.id,
              flagged: data.flagged,
              choice_id: data.choice_id,
              is_correct: data.is_correct,
              ms_to_answer: data.ms_to_answer
            }
          ]);
        }
      });
  }, [index, questions, session, syncSetsFromResponses, updateResponses]);

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

  const previous = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

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

    let currentStreak = 0;
    let longestStreak = 0;
    let rollingStreak = 0;
    let lastAnsweredIndex = -1;

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      const response = responses[question.id];
      if (!response || !response.choice_id) continue;
      lastAnsweredIndex = i;
      if (response.is_correct) {
        rollingStreak += 1;
        longestStreak = Math.max(longestStreak, rollingStreak);
      } else {
        rollingStreak = 0;
      }
    }

    if (lastAnsweredIndex >= 0) {
      for (let i = lastAnsweredIndex; i >= 0; i -= 1) {
        const response = responses[questions[i].id];
        if (!response || !response.choice_id) continue;
        if (!response.is_correct) break;
        currentStreak += 1;
      }
    }

    return {
      totalAnswered: base.totalAnswered,
      totalCorrect: base.totalCorrect,
      accuracy: base.totalAnswered ? base.totalCorrect / base.totalAnswered : null,
      averageMs: base.timedCount ? Math.round(base.totalMs / base.timedCount) : null,
      flagged: base.flagged,
      currentStreak,
      longestStreak
    } satisfies PracticeSessionStats;
  }, [questions, responses]);

  const sessionComplete = useMemo(
    () => !hasMore && questions.length > 0 && index >= questions.length - 1 && sessionStats.totalAnswered > 0,
    [hasMore, index, questions.length, sessionStats.totalAnswered]
  );

  return {
    questions,
    currentQuestion,
    currentResponse,
    index,
    loading,
    error,
    hasMore,
    next,
    previous,
    handleAnswer,
    handleFlagChange,
    reportIssue,
    sessionStats,
    sessionComplete,
    filters,
    applyFilters: setFilters,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError
  } as const;
}

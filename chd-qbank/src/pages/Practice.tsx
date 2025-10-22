import { useCallback, useEffect, useRef, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import type { Choice, ContextPanel, Question } from "../lib/constants";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { useSessionStore } from "../lib/auth";

type QuestionRow = Question & { choices: Choice[] };
type QuestionQueryRow = {
  id: string;
  slug: string;
  stem_md: string;
  lead_in: string | null;
  explanation_brief_md: string;
  explanation_deep_md: string | null;
  topic: string | null;
  subtopic: string | null;
  lesion: string | null;
  media_bundle: Question["media_bundle"];
  context_panels: ContextPanel[] | null;
  choices: Choice[] | null;
};

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

      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error: fetchError, count } = await supabase
        .from("questions")
        .select(
          "id, slug, stem_md, lead_in, explanation_brief_md, explanation_deep_md, topic, subtopic, lesion, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id,label,text_md,is_correct)",
          { count: "exact" }
        )
        .eq("status", "published")
        .range(from, to);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        loadingRef.current = false;
        return 0;
      }

      const normalized: QuestionRow[] = ((data ?? []) as QuestionQueryRow[]).map((item) => ({
        id: item.id,
        slug: item.slug,
        stem_md: item.stem_md,
        lead_in: item.lead_in,
        explanation_brief_md: item.explanation_brief_md,
        explanation_deep_md: item.explanation_deep_md,
        topic: item.topic,
        subtopic: item.subtopic,
        lesion: item.lesion,
        media_bundle: item.media_bundle ?? null,
        context_panels: item.context_panels ?? null,
        choices: (item.choices ?? []).slice().sort((a, b) => a.label.localeCompare(b.label))
      }));

      const randomized = normalized.sort(() => Math.random() - 0.5);

      let nextQuestions: QuestionRow[] = [];
      setQuestions((prev) => {
        const base = replace ? [] : prev;
        const map = new Map(base.map((question) => [question.id, question]));
        randomized.forEach((question) => {
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
      if (typeof count === "number") {
        setHasMore(nextQuestions.length < count);
      } else {
        setHasMore(normalized.length === PAGE_SIZE);
      }

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
    if (questions.length === 0) return;
    if (!hasMore) return;
    if (index < questions.length - 2) return;
    void loadPage(page + 1);
  }, [index, questions.length, hasMore, loadPage, page]);

  const handleAnswer = async (choice: Choice, ms: number, flagged: boolean) => {
    const current = questions[index];
    if (!current || !session) return;
    await supabase.from("responses").insert({
      user_id: session.user.id,
      question_id: current.id,
      choice_id: choice.id,
      is_correct: choice.is_correct,
      ms_to_answer: ms,
      flagged
    });
    if (choice.is_correct) {
      await supabase.rpc("increment_points", { delta: 1 });
    }
  };

  const handleFlagChange = useCallback(
    async (flagged: boolean) => {
      const current = questionsRef.current[index];
      if (!current || !session) return;
      await supabase
        .from("responses")
        .update({ flagged })
        .eq("user_id", session.user.id)
        .eq("question_id", current.id);
    },
    [index, session]
  );

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
      <QuestionCard question={current} onAnswer={handleAnswer} onFlagChange={handleFlagChange} />
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

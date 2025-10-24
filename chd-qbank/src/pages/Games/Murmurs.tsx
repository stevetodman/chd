import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import ErrorAlert from "../../components/ErrorAlert";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSessionStore } from "../../lib/auth";
import { supabase } from "../../lib/supabaseClient";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../../lib/markdown";
import {
  feedbackForMurmurOption,
  getNextMurmurIndex,
  MurmurItem,
  MurmurItemRow,
  MurmurOption,
  normalizeMurmurItems
} from "../../lib/games/murmurs";

export default function Murmurs() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<MurmurItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<MurmurOption | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(
    async (isActive?: () => boolean) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("murmur_items")
          .select(
            "id, prompt_md, rationale_md, media_url, murmur_options(id,label,text_md,is_correct)"
          )
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .limit(20);

        if (isActive && !isActive()) return;

        if (fetchError) {
          setError(fetchError.message);
          setItems([]);
          setIndex(0);
          setSelected(null);
          setFeedback(null);
          return;
        }

        const normalized = normalizeMurmurItems((data ?? []) as MurmurItemRow[]);

        setItems(normalized);
        setIndex(0);
        setSelected(null);
        setFeedback(null);
      } finally {
        if (isActive && !isActive()) return;
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    void fetchItems(() => active);
    return () => {
      active = false;
    };
  }, [fetchItems]);

  const current = items[index] ?? null;

  const choose = async (option: MurmurOption) => {
    if (!current) return;
    setSelected(option);
    setFeedback(feedbackForMurmurOption(option));
    setError(null);
    if (session) {
      const { data: attempt, error: attemptError } = await supabase
        .from("murmur_attempts")
        .insert({
          user_id: session.user.id,
          item_id: current.id,
          option_id: option.id,
          is_correct: option.is_correct
        })
        .select("id")
        .single();

      if (attemptError) {
        setError("We couldn't record your attempt. Please try again.");
        setSelected(null);
        setFeedback(null);
        return;
      }

      if (option.is_correct && attempt) {
        const { error: rpcError } = await supabase.rpc("increment_points", {
          source: "murmur_attempt",
          source_id: attempt.id
        });

        if (rpcError) {
          setError("Your answer was saved, but we couldn't update your points. Please try again later.");
        }
      }
    }
  };

  const next = () => {
    if (items.length === 0) return;
    setSelected(null);
    setFeedback(null);
    setIndex((prev) => getNextMurmurIndex(prev, items.length));
  };

  const initialLoading = loading && items.length === 0;
  const initialError = error && items.length === 0;
  const inlineError = error && items.length > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Guess the Murmur</h1>
      {initialLoading ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <Skeleton className="mb-4 h-40 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {initialError ? (
        <ErrorAlert
          title="Unable to load murmur clips"
          description={error}
          onRetry={() => void fetchItems()}
        />
      ) : null}
      {inlineError ? <ErrorAlert description={error} /> : null}
      {current ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <audio controls src={current.media_url} className="mb-4 w-full" />
          <div className="mb-4 text-sm text-neutral-700">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="prose prose-sm max-w-none"
            >
              {current.prompt_md ?? ""}
            </ReactMarkdown>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => (
              <Button
                key={option.id}
                variant={selected?.id === option.id ? (option.is_correct ? "primary" : "secondary") : "secondary"}
                onClick={() => choose(option)}
                disabled={Boolean(selected)}
              >
                <span className="mr-2 font-semibold">{option.label}.</span>
                <ReactMarkdown
                  remarkPlugins={markdownRemarkPlugins}
                  rehypePlugins={markdownRehypePlugins}
                  className="inline prose prose-sm max-w-none"
                >
                  {option.text_md}
                </ReactMarkdown>
              </Button>
            ))}
          </div>
          {feedback ? <p className="mt-4 text-sm font-semibold">{feedback}</p> : null}
          {selected && current.rationale_md ? (
            <div className="mt-2 text-sm text-neutral-600">
              <ReactMarkdown
                remarkPlugins={markdownRemarkPlugins}
                rehypePlugins={markdownRehypePlugins}
                className="prose prose-sm max-w-none"
              >
                {current.rationale_md}
              </ReactMarkdown>
            </div>
          ) : null}
          <Button type="button" className="mt-4" onClick={next} disabled={items.length === 0}>
            Next clip
          </Button>
        </div>
      ) : !initialLoading && !initialError ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
          No published murmur items available yet.
        </div>
      ) : null}
    </div>
  );
}

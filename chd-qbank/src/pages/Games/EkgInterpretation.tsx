import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../../components/ui/Button";
import { EkgCalipers } from "../../components/games/EkgCalipers";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../../lib/markdown";
import {
  DEFAULT_EKG_ALT_TEXT,
  feedbackForEkgOption,
  getNextEkgIndex,
  normalizeEkgItems,
  ekgAltTextForItem,
  type EkgItem,
  type EkgItemRow,
  type EkgOption
} from "../../lib/games/ekg";

export default function EkgInterpretation() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<EkgItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<EkgOption | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("ekg_items")
        .select("id, image_url, prompt_md, explanation_md, rhythm, ekg_options(id,label,text_md,is_correct)")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
        setItems([]);
        setIndex(0);
        setSelected(null);
        setFeedback(null);
        setLoading(false);
        return;
      }

      const normalized = normalizeEkgItems((data ?? []) as EkgItemRow[]);
      setItems(normalized);
      setIndex(0);
      setSelected(null);
      setFeedback(null);
      setLoading(false);
    };

    void fetchItems();

    return () => {
      active = false;
    };
  }, []);

  const current = items[index] ?? null;

  const altText = useMemo(() => ekgAltTextForItem(current), [current]);

  const choose = async (option: EkgOption) => {
    if (!current) return;
    setSelected(option);
    setFeedback(feedbackForEkgOption(option));
    setError(null);

    if (session) {
      const { data: attempt, error: attemptError } = await supabase
        .from("ekg_attempts")
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
          source: "ekg_attempt",
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
    setIndex((prev) => getNextEkgIndex(prev, items.length));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Read the EKG</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Identify hallmark rhythm findings on 12-lead tracings to sharpen rapid interpretation skills.
        </p>
      </div>
      {loading ? <p className="text-sm text-neutral-500">Loading EKG tracings…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {current ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <EkgCalipers src={current.image_url} alt={altText ?? DEFAULT_EKG_ALT_TEXT} />
          </div>
          {current.prompt_md ? (
            <div className="mb-4 text-sm text-neutral-700">
              <ReactMarkdown
                remarkPlugins={markdownRemarkPlugins}
                rehypePlugins={markdownRehypePlugins}
                className="prose prose-sm max-w-none"
              >
                {current.prompt_md}
              </ReactMarkdown>
            </div>
          ) : null}
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
          {selected && current.explanation_md ? (
            <div className="mt-2 text-sm text-neutral-600">
              <ReactMarkdown
                remarkPlugins={markdownRemarkPlugins}
                rehypePlugins={markdownRehypePlugins}
                className="prose prose-sm max-w-none"
              >
                {current.explanation_md}
              </ReactMarkdown>
            </div>
          ) : null}
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={next} disabled={items.length <= 1}>
              Next EKG
            </Button>
          </div>
        </div>
      ) : (
        !loading && <p className="text-sm text-neutral-600">No EKG items available yet. Check back soon!</p>
      )}
    </div>
  );
}

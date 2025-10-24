import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { useSessionStore } from '../../lib/auth';
import { markdownRemarkPlugins, markdownRehypePlugins } from '../../lib/markdown';
import {
  feedbackForMurmurOption,
  getNextMurmurIndex,
  MurmurItem,
  MurmurItemRow,
  MurmurOption,
  normalizeMurmurItems,
} from '../../lib/games/murmurs';

export default function Murmurs() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<MurmurItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<MurmurOption | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('murmur_items')
        .select(
          'id, prompt_md, rationale_md, media_url, murmur_options(id,label,text_md,is_correct)',
        )
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
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

      const normalized = normalizeMurmurItems((data ?? []) as MurmurItemRow[]);

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

  const choose = async (option: MurmurOption) => {
    if (!current) return;
    setSelected(option);
    setFeedback(feedbackForMurmurOption(option));
    setError(null);
    if (session) {
      const { data: attempt, error: attemptError } = await supabase
        .from('murmur_attempts')
        .insert({
          user_id: session.user.id,
          item_id: current.id,
          option_id: option.id,
          is_correct: option.is_correct,
        })
        .select('id')
        .single();

      if (attemptError) {
        setError("We couldn't record your attempt. Please try again.");
        setSelected(null);
        setFeedback(null);
        return;
      }

      if (option.is_correct && attempt) {
        const { error: rpcError } = await supabase.rpc('increment_points', {
          source: 'murmur_attempt',
          source_id: attempt.id,
        });

        if (rpcError) {
          setError(
            "Your answer was saved, but we couldn't update your points. Please try again later.",
          );
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Guess the Murmur</h1>
      {loading ? <p className="text-sm text-neutral-500">Loading murmur clips…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {current ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <audio controls src={current.media_url} className="mb-4 w-full" />
          <div className="mb-4 text-sm text-neutral-700">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="prose prose-sm max-w-none"
            >
              {current.prompt_md ?? ''}
            </ReactMarkdown>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => (
              <Button
                key={option.id}
                variant={
                  selected?.id === option.id
                    ? option.is_correct
                      ? 'primary'
                      : 'secondary'
                    : 'secondary'
                }
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
      ) : !loading && !error ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
          No published murmur items available yet.
        </div>
      ) : null}
    </div>
  );
}

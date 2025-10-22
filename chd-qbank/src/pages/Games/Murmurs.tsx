import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../../lib/markdown";
import {
  feedbackForMurmurOption,
  getNextMurmurIndex,
  MurmurItem,
  MurmurItemRow,
  MurmurOption,
  normalizeMurmurItems
} from "../../lib/games/murmurs";

type MurmurSupabaseClient = Pick<typeof supabase, "from" | "rpc">;

interface MurmurStateHandlers {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setItems: (items: MurmurItem[]) => void;
  setIndex: (index: number) => void;
  setSelected: (option: MurmurOption | null) => void;
  setFeedback: (feedback: string | null) => void;
}

export async function loadMurmurs(
  client: MurmurSupabaseClient,
  handlers: MurmurStateHandlers,
  isActive: () => boolean = () => true
) {
  handlers.setLoading(true);
  handlers.setError(null);

  const { data, error } = await client
    .from("murmur_items")
    .select(
      "id, prompt_md, rationale_md, media_url, murmur_options(id,label,text_md,is_correct)"
    )
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (!isActive()) {
    return;
  }

  if (error) {
    handlers.setError(error.message);
    handlers.setItems([]);
    handlers.setIndex(0);
    handlers.setSelected(null);
    handlers.setFeedback(null);
    handlers.setLoading(false);
    return;
  }

  const normalized = normalizeMurmurItems((data ?? []) as MurmurItemRow[]);

  handlers.setItems(normalized);
  handlers.setIndex(0);
  handlers.setSelected(null);
  handlers.setFeedback(null);
  handlers.setLoading(false);
}

type MurmurSession = { user: { id: string } } | null;

interface ChooseMurmurOptionParams {
  option: MurmurOption;
  current: MurmurItem | null;
  session: MurmurSession;
  supabaseClient: MurmurSupabaseClient;
  setSelected: (option: MurmurOption) => void;
  setFeedback: (feedback: string | null) => void;
}

export async function chooseMurmurOption({
  option,
  current,
  session,
  supabaseClient,
  setSelected,
  setFeedback
}: ChooseMurmurOptionParams) {
  if (!current) return;

  setSelected(option);
  setFeedback(feedbackForMurmurOption(option));

  if (!session) return;

  await supabaseClient.from("murmur_attempts").insert({
    user_id: session.user.id,
    item_id: current.id,
    option_id: option.id,
    is_correct: option.is_correct
  });

  if (option.is_correct) {
    await supabaseClient.rpc("increment_points", { delta: 1 });
  }
}

interface AdvanceMurmurParams {
  itemsLength: number;
  setIndex: (updater: (index: number) => number) => void;
  setSelected: (option: MurmurOption | null) => void;
  setFeedback: (feedback: string | null) => void;
}

export function advanceMurmur({
  itemsLength,
  setIndex,
  setSelected,
  setFeedback
}: AdvanceMurmurParams) {
  if (itemsLength === 0) return;

  setSelected(null);
  setFeedback(null);
  setIndex((prev) => getNextMurmurIndex(prev, itemsLength));
}

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

    void loadMurmurs(
      supabase,
      {
        setLoading,
        setError,
        setItems,
        setIndex,
        setSelected,
        setFeedback
      },
      () => active
    );

    return () => {
      active = false;
    };
  }, []);

  const current = items[index] ?? null;

  const choose = async (option: MurmurOption) => {
    if (!current) return;
    await chooseMurmurOption({
      option,
      current,
      session,
      supabaseClient: supabase,
      setSelected,
      setFeedback
    });
  };

  const next = () => {
    advanceMurmur({
      itemsLength: items.length,
      setIndex,
      setSelected,
      setFeedback
    });
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
      ) : !loading && !error ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
          No published murmur items available yet.
        </div>
      ) : null}
    </div>
  );
}

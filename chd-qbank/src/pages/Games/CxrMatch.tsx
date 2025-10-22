import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";

interface Label {
  id: string;
  label: string;
  is_correct: boolean;
}

interface CxrItem {
  id: string;
  image_url: string;
  caption_md?: string | null;
  labels: Label[];
}

const shuffle = <T,>(input: T[]): T[] => {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

type CxrLabelRow = { id: string; label: string; is_correct: boolean | null };
type CxrItemRow = {
  id: string;
  image_url: string;
  caption_md: string | null;
  cxr_labels: CxrLabelRow[] | null;
};

export default function CxrMatch() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<CxrItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    supabase
      .from("cxr_items")
      .select("id, image_url, caption_md, cxr_labels(id,label,is_correct)")
      .eq("status", "published")
      .limit(20)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setItems([]);
          return;
        }
        const normalized: CxrItem[] = ((data ?? []) as CxrItemRow[]).map((item) => ({
          id: item.id,
          image_url: item.image_url,
          caption_md: item.caption_md,
          labels: shuffle((item.cxr_labels ?? []).map((label) => ({
            id: label.id,
            label: label.label,
            is_correct: Boolean(label.is_correct)
          })))
        }));
        setItems(shuffle(normalized));
        setIndex(0);
      })
      .finally(() => setLoading(false));
  }, []);

  const current = items[index];
  const correctLabel = useMemo(() => current?.labels.find((label) => label.is_correct) ?? null, [current]);

  const submit = async (label: Label) => {
    const correct = label.is_correct;
    setSelected(label.id);
    if (correct) {
      setMessage("Correct!");
    } else if (correctLabel) {
      setMessage(`Not quite. The correct answer is ${correctLabel.label}.`);
    } else {
      setMessage("Not quite. Try another lesion.");
    }
    if (session) {
      await supabase.from("cxr_attempts").insert({
        user_id: session.user.id,
        item_id: current.id,
        is_correct: correct,
        detail: { selected: label.label }
      });
      if (correct) {
        await supabase.rpc("increment_points", { delta: 1 });
      }
    }
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % items.length);
    setSelected(null);
    setMessage(null);
  };

  if (!current) {
    if (loading) return <div>Loading radiographs…</div>;
    if (error) return <div className="text-red-600">{error}</div>;
    return <div>No CXR match items configured.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">CXR Sign Match</h1>
      {loading ? <p className="text-sm text-neutral-500">Loading radiographs…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <img src={current.image_url} alt="CXR" className="w-full max-w-md rounded" />
          <div className="flex-1 space-y-2 text-sm text-neutral-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]} className="prose prose-sm max-w-none">
              {current.caption_md ?? "Match the imaging sign with the lesion."}
            </ReactMarkdown>
            <p className="text-xs text-neutral-500">
              Drag-and-drop ready: wire up react-dnd for production; this scaffold provides a keyboard-accessible picker.
            </p>
            <div className="grid gap-2">
              {current.labels.map((label) => (
                <Button
                  key={label.id}
                  variant={selected === label.id ? "primary" : "secondary"}
                  onClick={() => submit(label)}
                  disabled={Boolean(selected)}
                >
                  {label.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm font-semibold">{message}</p> : null}
        <Button type="button" className="mt-4" onClick={next} disabled={items.length === 0}>
          Next image
        </Button>
      </div>
    </div>
  );
}

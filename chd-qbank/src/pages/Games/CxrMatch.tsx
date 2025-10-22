import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../../lib/markdown";

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
  const [isDropActive, setIsDropActive] = useState(false);

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
    if (selected) return;
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
      const { data: attempt, error: attemptError } = await supabase
        .from("cxr_attempts")
        .insert({
          user_id: session.user.id,
          item_id: current.id,
          is_correct: correct,
          detail: { selected: label.label }
        })
        .select("id")
        .single();

      if (attemptError) {
        setError("We couldn't record your attempt. Please try again.");
        return;
      }

      if (correct && attempt) {
        const { error: rpcError } = await supabase.rpc("increment_points", {
          source: "cxr_attempt",
          source_id: attempt.id
        });

        if (rpcError) {
          setError("Your answer was saved, but we couldn't update your points. Please try again later.");
        }
      }
    }
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % items.length);
    setSelected(null);
    setMessage(null);
    setIsDropActive(false);
  };

  const selectedLabel = useMemo(
    () => (selected && current ? current.labels.find((label) => label.id === selected) ?? null : null),
    [current, selected]
  );

  useEffect(() => {
    setIsDropActive(false);
  }, [current?.id]);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, label: Label) => {
    if (selected) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify({ id: label.id }));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    if (selected || !current) return;
    try {
      const payload = event.dataTransfer.getData("application/json");
      if (!payload) return;
      const { id } = JSON.parse(payload) as { id: string };
      const match = current.labels.find((label) => label.id === id);
      if (match) {
        void submit(match);
      }
    } catch {
      // Ignore malformed payloads.
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (selected) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (selected) return;
    event.preventDefault();
    setIsDropActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDropActive(false);
  };

  const handleDragEnd = () => {
    setIsDropActive(false);
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
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="prose prose-sm max-w-none"
            >
              {current.caption_md ?? "Match the imaging sign with the lesion."}
            </ReactMarkdown>
            <div
              className={`flex min-h-[6rem] items-center justify-center rounded-md border-2 border-dashed text-center text-sm transition-colors ${
                isDropActive ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-300 text-neutral-500"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              aria-label="Drop a lesion label here"
            >
              {selectedLabel ? (
                <span className="font-semibold text-neutral-900">{selectedLabel.label}</span>
              ) : (
                <span>
                  Drag a label here to submit, or activate a button below.
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">Labels remain keyboard accessible—use space or enter to select.</p>
            <div className="grid gap-2">
              {current.labels.map((label) => (
                <Button
                  key={label.id}
                  variant={selected === label.id ? "primary" : "secondary"}
                  draggable={!selected}
                  onDragStart={(event) => handleDragStart(event, label)}
                  onDragEnd={handleDragEnd}
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

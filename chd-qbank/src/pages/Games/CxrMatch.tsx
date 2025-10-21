import { useEffect, useState } from "react";
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
}

interface CxrItem {
  id: string;
  image_url: string;
  caption_md?: string | null;
  labels: Label[];
}

const SEED_ITEMS: CxrItem[] = [
  {
    id: "seed-cxr-1",
    image_url: "cxr/egg_tga.webp",
    caption_md: "Identify the classic congenital heart lesion.",
    labels: [
      { id: "seed-cxr-l1", label: "Egg-on-a-string" },
      { id: "seed-cxr-l2", label: "Snowman" },
      { id: "seed-cxr-l3", label: "Boot" },
      { id: "seed-cxr-l4", label: "Rib notching" }
    ]
  }
];

export default function CxrMatch() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<CxrItem[]>(SEED_ITEMS);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("cxr_items")
      .select("id, image_url, caption_md, cxr_labels(id,label)")
      .limit(10)
      .then(({ data }) => {
        if (data && data.length) {
          setItems(
            data.map((item: any) => ({
              id: item.id,
              image_url: item.image_url,
              caption_md: item.caption_md,
              labels: item.cxr_labels ?? []
            }))
          );
        }
      });
  }, []);

  const current = items[index];

  const submit = async (label: Label) => {
    const correct = label.label.toLowerCase().includes("egg");
    setSelected(label.id);
    setMessage(correct ? "Correct!" : "Not quite. Try another lesion.");
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

  if (!current) return <div>No CXR match items configured.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">CXR Sign Match</h1>
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
        <Button type="button" className="mt-4" onClick={next}>
          Next image
        </Button>
      </div>
    </div>
  );
}

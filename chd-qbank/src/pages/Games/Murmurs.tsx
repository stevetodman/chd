import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";

type MurmurOption = {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
};

type MurmurItem = {
  id: string;
  prompt_md?: string | null;
  rationale_md?: string | null;
  media_url: string;
  options: MurmurOption[];
};

const SEED: MurmurItem[] = [
  {
    id: "seed-murmur-1",
    prompt_md: "Identify the lesion associated with this harsh systolic murmur.",
    rationale_md: "TOF produces a crescendo-decrescendo murmur at the LUSB due to RVOT obstruction.",
    media_url: "murmurs/tof_harsh_systolic.mp3",
    options: [
      { id: "seed-mo-1a", label: "A", text_md: "ASD", is_correct: false },
      { id: "seed-mo-1b", label: "B", text_md: "Tetralogy of Fallot", is_correct: true },
      { id: "seed-mo-1c", label: "C", text_md: "Truncus arteriosus", is_correct: false },
      { id: "seed-mo-1d", label: "D", text_md: "AV canal defect", is_correct: false }
    ]
  }
];

export default function Murmurs() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<MurmurItem[]>(SEED);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<MurmurOption | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("murmur_items")
      .select("id, prompt_md, rationale_md, media_url, murmur_options(id,label,text_md,is_correct)")
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setItems(
            data.map((item: any) => ({
              id: item.id,
              prompt_md: item.prompt_md,
              rationale_md: item.rationale_md,
              media_url: item.media_url,
              options: item.murmur_options ?? []
            }))
          );
        }
      });
  }, []);

  const current = items[index];

  const choose = async (option: MurmurOption) => {
    setSelected(option);
    setFeedback(option.is_correct ? "Correct!" : "Try again");
    if (session) {
      await supabase.from("murmur_attempts").insert({
        user_id: session.user.id,
        item_id: current.id,
        option_id: option.id,
        is_correct: option.is_correct
      });
      if (option.is_correct) {
        await supabase.rpc("increment_points", { delta: 1 });
      }
    }
  };

  const next = () => {
    setSelected(null);
    setFeedback(null);
    setIndex((prev) => (prev + 1) % items.length);
  };

  if (!current) return <div>No murmur items configured.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Guess the Murmur</h1>
      <audio controls src={current.media_url} className="w-full" />
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-4 text-sm text-neutral-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]} className="prose prose-sm max-w-none">
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]} className="inline prose prose-sm max-w-none">
                {option.text_md}
              </ReactMarkdown>
            </Button>
          ))}
        </div>
        {feedback ? <p className="mt-4 text-sm font-semibold">{feedback}</p> : null}
        {selected && current.rationale_md ? (
          <div className="mt-2 text-sm text-neutral-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]} className="prose prose-sm max-w-none">
              {current.rationale_md}
            </ReactMarkdown>
          </div>
        ) : null}
        <Button type="button" className="mt-4" onClick={next}>
          Next clip
        </Button>
      </div>
    </div>
  );
}

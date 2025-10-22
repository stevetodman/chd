import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";

type FlaggedResponse = {
  id: string;
  questions: { stem_md: string; lead_in: string | null } | null;
};

export default function Review() {
  const { session } = useSessionStore();
  const [flags, setFlags] = useState<FlaggedResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;

    const loadFlags = async () => {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("responses")
        .select("*, questions(stem_md, lead_in)")
        .eq("user_id", session.user.id)
        .eq("flagged", true)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setFlags((data ?? []) as FlaggedResponse[]);
    };

    void loadFlags();

    return () => {
      isMounted = false;
    };
  }, [session]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Flagged for Review</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-3">
        {flags.map((flag) => (
          <li key={flag.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">{flag.questions?.lead_in}</p>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
              className="prose prose-sm text-neutral-700"
            >
              {flag.questions?.stem_md ?? ""}
            </ReactMarkdown>
          </li>
        ))}
        {flags.length === 0 && !error ? <p className="text-sm text-neutral-600">No flagged questions yet.</p> : null}
      </ul>
    </div>
  );
}

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import { fetchFlaggedResponses, type FlaggedResponse } from "../lib/reviewFlow";

export default function Review() {
  const { session } = useSessionStore();
  const [flags, setFlags] = useState<FlaggedResponse[]>([]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void fetchFlaggedResponses(supabase, session.user.id)
      .then((rows) => {
        if (!active) return;
        setFlags(rows);
      })
      .catch(() => {
        if (!active) return;
        setFlags([]);
      });
    return () => {
      active = false;
    };
  }, [session]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Flagged for Review</h1>
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
        {flags.length === 0 ? <p className="text-sm text-neutral-600">No flagged questions yet.</p> : null}
      </ul>
    </div>
  );
}

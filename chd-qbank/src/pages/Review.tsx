import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";

export type FlaggedResponse = {
  id: string;
  questions: { stem_md: string; lead_in: string | null } | null;
};

export async function loadFlaggedResponses(client: typeof supabase, userId: string) {
  const { data } = await client
    .from("responses")
    .select("*, questions(stem_md, lead_in)")
    .eq("user_id", userId)
    .eq("flagged", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as FlaggedResponse[];
}

export default function Review() {
  const { session } = useSessionStore();
  const [flags, setFlags] = useState<FlaggedResponse[]>([]);

  useEffect(() => {
    if (!session) return;
    loadFlaggedResponses(supabase, session.user.id).then((results) => {
      setFlags(results);
    });
  }, [session]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Flagged for Review</h1>
      <ul className="space-y-3">
        {flags.map((flag) => (
          <li key={flag.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">{flag.questions?.lead_in}</p>
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
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

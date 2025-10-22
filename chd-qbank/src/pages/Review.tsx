import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type FlaggedResponse = {
  id: string;
  created_at: string;
  questions: { stem_md: string; lead_in: string | null } | null;
};

export default function Review() {
  const { session } = useSessionStore();
  const [flags, setFlags] = useState<FlaggedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("responses")
      .select("id, created_at, questions(stem_md, lead_in)")
      .eq("user_id", session.user.id)
      .eq("flagged", true)
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(error.message);
      setFlags([]);
    } else {
      setFlags((data ?? []) as FlaggedResponse[]);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const handleUnflag = useCallback(
    async (responseId: string) => {
      if (!session) return;
      setProcessingId(responseId);
      setActionMessage(null);
      setActionError(null);

      const { error } = await supabase
        .from("responses")
        .update({ flagged: false })
        .eq("id", responseId)
        .eq("user_id", session.user.id);

      if (error) {
        setActionError(error.message);
      } else {
        setFlags((previous) => previous.filter((flag) => flag.id !== responseId));
        setActionMessage("Removed from review queue. Nice work!");
      }

      setProcessingId(null);
    },
    [session]
  );

  const emptyState = useMemo(() => !loading && !flags.length && !fetchError, [flags.length, fetchError, loading]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Review flagged questions</h1>
        <p className="text-sm text-neutral-600">
          Work through the items you saved during practice. Mark questions as reviewed to remove them from this list.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button type="button" variant="secondary" onClick={() => void loadFlags()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh list"}
        </Button>
        <span className="text-neutral-500">
          {flags.length === 1 ? "1 question awaiting review" : `${flags.length} questions awaiting review`}
        </span>
      </div>

      {fetchError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {fetchError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
          {actionMessage}
        </div>
      ) : null}

      {loading && !flags.length ? (
        <div className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600">Loading flagged questions…</div>
      ) : null}

      <div className="space-y-4">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <CardTitle className="text-base">{flag.questions?.lead_in ?? "Practice question"}</CardTitle>
              <CardDescription className="text-xs">
                Added to review on {new Date(flag.created_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-700">
              <ReactMarkdown
                remarkPlugins={markdownRemarkPlugins}
                rehypePlugins={markdownRehypePlugins}
                className="prose prose-sm max-w-none text-neutral-800"
              >
                {flag.questions?.stem_md ?? ""}
              </ReactMarkdown>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleUnflag(flag.id)}
                disabled={processingId === flag.id}
              >
                {processingId === flag.id ? "Saving…" : "Mark as reviewed"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {emptyState ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No flagged questions yet</CardTitle>
            <CardDescription>Flag items during practice to revisit them here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-neutral-600">
            Visit tutor mode or a learning game to flag tricky questions and build your personal review set.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

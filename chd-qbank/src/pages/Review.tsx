import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import { normalizeQuestionRows, type QuestionQueryRow } from "../lib/practice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import PageState from "../components/PageState";
import ReviewQuestionCard, { type ReviewFlag } from "../components/ReviewQuestionCard";
import { useFeatureFlagsStore } from "../store/featureFlags";

type FlaggedResponseRow = {
  id: string;
  created_at: string;
  questions: QuestionQueryRow | null;
};

export default function Review() {
  const { session } = useSessionStore();
  const [flags, setFlags] = useState<ReviewFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { tutorModeEnabled, learningGamesEnabled } = useFeatureFlagsStore((state) => ({
    tutorModeEnabled: state.tutorModeEnabled,
    learningGamesEnabled: state.learningGamesEnabled
  }));

  const loadFlags = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("responses")
      .select(
        `id, created_at, questions(
          id,
          slug,
          stem_md,
          lead_in,
          explanation_brief_md,
          explanation_deep_md,
          topic,
          subtopic,
          lesion,
          context_panels,
          media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text),
          choices(id,label,text_md,is_correct)
        )`
      )
      .eq("user_id", session.user.id)
      .eq("flagged", true)
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(error.message);
      setFlags([]);
    } else {
      const typed = (data ?? []) as FlaggedResponseRow[];
      const mapped: ReviewFlag[] = typed
        .map((row) => {
          if (!row.questions) return null;
          const [question] = normalizeQuestionRows([row.questions]);
          if (!question) return null;
          return { id: row.id, created_at: row.created_at, question } satisfies ReviewFlag;
        })
        .filter((item): item is ReviewFlag => item !== null);
      setFlags(mapped);
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
  const emptyStateMessage = useMemo(() => {
    if (tutorModeEnabled && learningGamesEnabled) {
      return "Visit tutor mode or a learning game to flag tricky questions and build your personal review set.";
    }
    if (tutorModeEnabled) {
      return "Visit tutor mode to flag tricky questions and build your personal review set.";
    }
    if (learningGamesEnabled) {
      return "Play a learning game to flag tricky questions and build your personal review set.";
    }
    return "Flag questions in available activities to build your personal review set.";
  }, [learningGamesEnabled, tutorModeEnabled]);

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
        <PageState
          title="Loading your review queue"
          description="Pulling in the questions you flagged during practice."
          fullHeight
        />
      ) : null}

      <div className="space-y-4">
        {flags.map((flag) => (
          <ReviewQuestionCard
            key={flag.id}
            flag={flag}
            onMarkReviewed={() => handleUnflag(flag.id)}
            processing={processingId === flag.id}
          />
        ))}
      </div>

      {emptyState ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No flagged questions yet</CardTitle>
            <CardDescription>Flag items during practice to revisit them here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-neutral-600">
            {emptyStateMessage}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

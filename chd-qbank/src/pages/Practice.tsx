import { useEffect } from "react";
import { Link } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { PageState } from "../components/PageState";
import { classNames } from "../lib/utils";

export default function Practice() {
  const {
    questions,
    currentQuestion,
    currentResponse,
    index,
    loading,
    error,
    hasMore,
    next,
    handleAnswer,
    handleFlagChange,
    sessionStats,
    sessionComplete
  } = usePracticeSession();

  if (loading && questions.length === 0) {
    return (
      <PageState
        status="loading"
        title="Loading tutor mode"
        description="We&rsquo;re lining up a fresh batch of CHD questions for you."
      >
        <PracticeSkeleton />
      </PageState>
    );
  }

  if (error && questions.length === 0) {
    return (
      <PageState
        status="error"
        title="We couldn&rsquo;t start practice"
        description={
          <>
            <p>{error}</p>
            <p>Refresh the page or check your connection, then try again.</p>
          </>
        }
        actions={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  if (!currentQuestion)
    return (
      <PageState
        status="empty"
        title="No questions to practice right now"
        description="You&rsquo;ve worked through every available item. Come back soon for more questions."
        actions={
          <Link to="/dashboard" className="font-medium text-brand-600 underline">
            Return to dashboard
          </Link>
        }
      />
    );

  const canAdvance = !(
    (!hasMore && index >= questions.length - 1) || questions.length === 0
  );

  const accuracyPercent =
    sessionStats.accuracy !== null ? Math.round(sessionStats.accuracy * 100) : null;
  const averageSeconds =
    sessionStats.averageMs !== null ? (sessionStats.averageMs / 1000).toFixed(1) : "–";
  const progressPercent = Math.min(
    100,
    Math.round(((index + 1) / Math.max(questions.length, 1)) * 100)
  );

  const streakLabel = sessionStats.currentStreak > 0 ? `${sessionStats.currentStreak} correct` : "Fresh start";
  const remainingCount = Math.max(questions.length - sessionStats.totalAnswered, 0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key?.toLowerCase() !== "n") return;
      if (!canAdvance) return;

      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      next();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance, next]);

  return (
    <div className="space-y-6">
      <section className="sticky top-6 z-10 -mx-4 space-y-4 rounded-3xl border border-neutral-200 bg-white/90 px-4 py-4 backdrop-blur-sm shadow-sm sm:mx-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Tutor mode</p>
            <h1 className="text-xl font-semibold text-neutral-900">Question {index + 1}</h1>
            <p className="text-sm text-neutral-500">{questions.length} questions loaded • {hasMore ? "More en route" : "Current set"}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <StatusChip label="Streak" value={streakLabel} tone={sessionStats.currentStreak > 0 ? "success" : "neutral"} />
            <StatusChip
              label="Accuracy"
              value={accuracyPercent !== null ? `${accuracyPercent}%` : "—"}
              tone={accuracyPercent !== null && accuracyPercent >= 80 ? "success" : accuracyPercent !== null && accuracyPercent <= 50 ? "warning" : "neutral"}
            />
            <StatusChip label="Avg. pace" value={`${averageSeconds}s`} tone="neutral" />
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{sessionStats.totalAnswered} answered</span>
          <span>{remainingCount} remaining in set</span>
        </div>
      </section>
      <QuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        onFlagChange={handleFlagChange}
        initialFlagged={currentResponse?.flagged ?? false}
      />
      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Navigation</p>
            <p className="text-sm text-neutral-600">Press <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1">N</kbd> to move forward</p>
          </div>
          <Button type="button" onClick={next} aria-keyshortcuts="n" disabled={!canAdvance}>
            {canAdvance ? "Next question" : "All caught up"}
          </Button>
        </div>
      </div>
      {sessionComplete ? (
        <Card className="border-emerald-200">
          <CardHeader className="border-emerald-100 bg-emerald-50/70">
            <CardTitle className="text-base text-emerald-900">Great work! Session complete.</CardTitle>
            <CardDescription className="text-emerald-800">
              You powered through {sessionStats.totalAnswered} questions. Here&rsquo;s a quick recap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-neutral-700">
            <dl className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Accuracy" value={accuracyPercent !== null ? `${accuracyPercent}%` : "Not enough data"} helper={`${sessionStats.totalCorrect} correct`} tone="emerald" />
              <StatTile label="Current streak" value={`${sessionStats.currentStreak}`} helper={`Best streak: ${sessionStats.longestStreak}`} tone="brand" />
              <StatTile label="Avg. time" value={averageSeconds !== "–" ? `${averageSeconds}s` : "Not recorded"} helper="Keep a steady pace for mastery" tone="neutral" />
            </dl>
            {sessionStats.flagged > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <p className="font-medium">
                  {sessionStats.flagged} question{sessionStats.flagged === 1 ? "" : "s"} saved for spaced review.
                </p>
                <p className="text-sm">
                  Revisit them on the <Link to="/review" className="font-semibold underline">review page</Link> tomorrow to lock in the learning.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
                <p className="font-medium">No flagged questions yet.</p>
                <p className="text-sm">Flag tricky items during practice so they show up in your spaced-review queue.</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/practice" className={primaryLinkButtonClass}>
                Start another round
              </Link>
              <Link to="/review" className={secondaryLinkButtonClass}>
                Jump to review
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

function PracticeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-6 w-3/4 animate-pulse rounded-full bg-neutral-200" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
      <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
    </div>
  );
}

type StatusChipTone = "success" | "warning" | "neutral" | "brand";

function StatusChip({ label, value, tone }: { label: string; value: string; tone: StatusChipTone }) {
  const toneClasses: Record<StatusChipTone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-600",
    brand: "border-brand-200 bg-brand-50 text-brand-700"
  };
  return (
    <div className={`rounded-full border px-3 py-1 text-left text-xs font-medium ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "brand" | "neutral";
}) {
  const toneMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    brand: "border-brand-200 bg-brand-50 text-brand-900",
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-900"
  };
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="text-xs text-neutral-600 opacity-90">{helper}</div>
    </div>
  );
}

const baseButtonClass =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

const primaryLinkButtonClass = classNames(baseButtonClass, "bg-brand-600 text-white hover:bg-brand-500");
const secondaryLinkButtonClass = classNames(baseButtonClass, "bg-neutral-100 text-neutral-900 hover:bg-neutral-200");

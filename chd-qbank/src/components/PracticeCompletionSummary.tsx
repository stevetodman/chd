import { Link } from "react-router-dom";
import { SLOW_RESPONSE_THRESHOLD_MS } from "../lib/practice";
import type { PracticeSessionSummary } from "../hooks/usePracticeSession";
import { Button } from "./ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card";

type Props = {
  summary: PracticeSessionSummary;
  onRestart: () => void;
};

const slowThresholdSeconds = Math.round(SLOW_RESPONSE_THRESHOLD_MS / 1000);

export default function PracticeCompletionSummary({ summary, onRestart }: Props) {
  const { accuracy, answeredCount, correctCount, incorrectCount, flaggedCount, slowResponses, missedQuestions } = summary;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session complete</CardTitle>
          <CardDescription>We saved your progress and queued missed questions for review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Accuracy</dt>
              <dd className="mt-2 text-2xl font-semibold text-neutral-900">{accuracy}%</dd>
              <p className="mt-1 text-xs text-neutral-500">
                {answeredCount === 0
                  ? "No questions answered this session."
                  : `${correctCount} of ${answeredCount} correct`}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Missed questions</dt>
              <dd className="mt-2 text-2xl font-semibold text-neutral-900">{incorrectCount}</dd>
              <p className="mt-1 text-xs text-neutral-500">Automatically added to your review queue.</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Flagged for review</dt>
              <dd className="mt-2 text-2xl font-semibold text-neutral-900">{flaggedCount}</dd>
              <p className="mt-1 text-xs text-neutral-500">Includes manual flags and automatic misses.</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Slow responses</dt>
              <dd className="mt-2 text-2xl font-semibold text-neutral-900">{slowResponses.length}</dd>
              <p className="mt-1 text-xs text-neutral-500">≥ {slowThresholdSeconds} seconds to answer.</p>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 text-sm">
            <Button type="button" onClick={onRestart}>
              Start a new session
            </Button>
            <Link
              to="/review"
              className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 underline-offset-2 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Go to review queue
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slowest responses</CardTitle>
          <CardDescription>
            {slowResponses.length
              ? "Focus on these items to build speed and confidence."
              : "Nice work! None of your answers crossed the slow threshold."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slowResponses.length ? (
            <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
              {slowResponses.map(({ question }) => (
                <li key={question.id}>{question.lead_in ?? "Practice question"}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-600">Keep practicing to reinforce your pacing.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queued for spaced review</CardTitle>
          <CardDescription>
            {missedQuestions.length
              ? "Revisit these questions from your review queue to cement the concepts."
              : "No misses this time—great job!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {missedQuestions.length ? (
            <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
              {missedQuestions.map(({ question }) => (
                <li key={question.id}>{question.lead_in ?? "Practice question"}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-600">You cleared every question correctly.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

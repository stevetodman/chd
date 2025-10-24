import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import type { PracticeSessionStats } from "../../hooks/usePracticeSession";
import type { MessageDescriptor, MessageValues } from "../../i18n";
import type { BadgeStatus } from "../../lib/badges";

interface PracticeSessionRailCardProps {
  currentIndex: number;
  totalQuestions: number;
  progressPercent: number;
  canAdvance: boolean;
  onNext: () => void;
  sessionStats: PracticeSessionStats;
  elapsedLabel: string;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  badges: BadgeStatus[];
  badgesLoading: boolean;
  badgesError: string | null;
  showBadges: boolean;
  className?: string;
}

export function PracticeSessionRailCard({
  currentIndex,
  totalQuestions,
  progressPercent,
  canAdvance,
  onNext,
  sessionStats,
  elapsedLabel,
  formatMessage,
  formatNumber,
  badges,
  badgesLoading,
  badgesError,
  showBadges,
  className
}: PracticeSessionRailCardProps) {
  return (
    <Card variant="secondary" className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {formatMessage({ id: "practice.sessionRail.title", defaultMessage: "Session overview" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-neutral-700">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <span>{formatMessage({ id: "practice.sessionRail.progress", defaultMessage: "Progress" })}</span>
            <span>
              {formatMessage(
                {
                  id: "practice.progress.counter",
                  defaultMessage: "Q {current, number, integer} of {total, number, integer}"
                },
                { current: currentIndex + 1, total: totalQuestions }
              )}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {showBadges ? (
          <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="font-semibold uppercase tracking-wide">
                {formatMessage({ id: "practice.sessionRail.badges", defaultMessage: "Earned badges" })}
              </span>
              {badgesLoading ? (
                <span className="text-emerald-600">
                  {formatMessage({ id: "practice.sessionRail.badgesLoading", defaultMessage: "Updating…" })}
                </span>
              ) : null}
            </div>
            {badgesError ? (
              <p className="text-xs text-red-600">{badgesError}</p>
            ) : badges.length > 0 ? (
              <ul className="flex flex-wrap gap-2 text-emerald-700">
                {badges.map((badge) => (
                  <li
                    key={badge.id}
                    className="flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 font-medium shadow-sm"
                  >
                    <span aria-hidden="true" className="text-base">
                      {badge.icon}
                    </span>
                    <span>{badge.label}</span>
                  </li>
                ))}
              </ul>
            ) : badgesLoading ? (
              <p className="text-xs text-emerald-700">
                {formatMessage({ id: "practice.sessionRail.badgesChecking", defaultMessage: "Checking your badges…" })}
              </p>
            ) : (
              <p className="text-xs text-emerald-700">
                {formatMessage({ id: "practice.sessionRail.badgesEmpty", defaultMessage: "Keep practicing to unlock badges." })}
              </p>
            )}
          </div>
        ) : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.elapsed", defaultMessage: "Elapsed time" })}
            </dt>
            <dd className="font-semibold text-neutral-900">{elapsedLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.streak", defaultMessage: "Current streak" })}
            </dt>
            <dd className="font-semibold text-neutral-900">
              {formatMessage(
                {
                  id: "practice.sessionRail.streakValue",
                  defaultMessage: "{count, plural, one {# correct} other {# correct}}"
                },
                { count: sessionStats.currentStreak }
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.accuracy", defaultMessage: "Accuracy" })}
            </dt>
            <dd className="font-semibold text-neutral-900">
              {sessionStats.accuracy !== null
                ? formatNumber(sessionStats.accuracy, { style: "percent", maximumFractionDigits: 0 })
                : formatMessage({
                    id: "practice.sessionRail.accuracyEmpty",
                    defaultMessage: "Not enough data yet"
                  })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">
              {formatMessage({ id: "practice.sessionRail.flagged", defaultMessage: "Flagged" })}
            </dt>
            <dd className="font-semibold text-neutral-900">{formatNumber(sessionStats.flagged)}</dd>
          </div>
        </dl>
        <Button
          type="button"
          onClick={onNext}
          aria-keyshortcuts="ArrowRight n"
          disabled={!canAdvance}
          className="w-full"
        >
          {formatMessage({ id: "practice.actions.next", defaultMessage: "Next question" })}
        </Button>
      </CardContent>
    </Card>
  );
}

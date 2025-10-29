import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import type { DashboardMetrics } from "../lib/constants";
import { EMPTY_DASHBOARD_METRICS, fetchDashboardMetrics } from "../lib/dashboard";
import PracticeTrendChart from "../components/Charts/PracticeTrendChart";
import type { PracticeTrendDatum } from "../types/practice";
import { computeWeeklyStreak, fetchPracticeTrendData } from "../lib/practiceTrend";
import { evaluateBadges } from "../lib/badges";

type TopicInsight = {
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
  lastActivity: Date | null;
};

interface FeaturedQuestion {
  id: string;
  lead_in: string | null;
}

const shuffle = <T,>(values: T[]): T[] => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function Dashboard() {
  const { session } = useSessionStore();
  const [aliasNeeded, setAliasNeeded] = useState(false);
  const [aliasLabel, setAliasLabel] = useState<string | null>(null);
  const [featured, setFeatured] = useState<FeaturedQuestion[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ ...EMPTY_DASHBOARD_METRICS });
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsReloadKey, setMetricsReloadKey] = useState(0);
  const [trendData, setTrendData] = useState<PracticeTrendDatum[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [topicInsights, setTopicInsights] = useState<TopicInsight[]>([]);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("app_users")
      .select("alias, alias_locked")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setAliasNeeded(false);
          setAliasLabel(null);
          return;
        }
        const alias = data?.alias?.trim() ?? "";
        if (alias.length > 0) {
          setAliasNeeded(false);
          setAliasLabel(alias);
        } else {
          setAliasNeeded(true);
          setAliasLabel(null);
        }
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setMetricsLoading(true);
    setMetricsError(null);

    void (async () => {
      try {
        const data = await fetchDashboardMetrics();
        if (!active) return;
        setMetrics(data);
        setMetricsLoaded(true);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Unable to load progress.";
        setMetrics({ ...EMPTY_DASHBOARD_METRICS });
        setMetricsLoaded(true);
        setMetricsError(message);
      } finally {
        if (!active) return;
        setMetricsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, metricsReloadKey]);

  useEffect(() => {
    setLoadingFeatured(true);
    setFeaturedError(null);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("id, lead_in")
          .eq("status", "published")
          .limit(5);

        if (error) {
          setFeaturedError(error.message);
          setFeatured([]);
          return;
        }
        const randomized = shuffle(data ?? []);
        setFeatured(randomized.map((row) => ({ id: row.id, lead_in: row.lead_in })));
      } finally {
        setLoadingFeatured(false);
      }
    })();
  }, []);

  const refreshMetrics = () => {
    setMetricsReloadKey((key) => key + 1);
  };

  useEffect(() => {
    if (!session) {
      setTrendData([]);
      setTrendError(null);
      setTrendLoading(false);
      setTopicInsights([]);
      setTopicError(null);
      setTopicLoading(false);
      return;
    }

    let active = true;
    setTrendLoading(true);
    setTrendError(null);

    setTopicLoading(true);
    setTopicError(null);

    void (async () => {
      try {
        const points = await fetchPracticeTrendData(session.user.id);
        if (!active) return;
        setTrendData(points);
      } catch {
        if (!active) return;
        setTrendError("We couldn't load your recent practice. Try again shortly.");
        setTrendData([]);
      } finally {
        if (!active) return;
        setTrendLoading(false);
      }
    })();

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("responses")
          .select("is_correct, created_at, question:questions(topic)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!active) return;
        if (error) {
          setTopicError("Topic insights are unavailable right now.");
          setTopicInsights([]);
          return;
        }

        const aggregates = new Map<string, { attempts: number; correct: number; lastActivity: Date | null }>();
        for (const row of data ?? []) {
          const rawTopic =
            (row as { question?: { topic?: string | null } | null })?.question?.topic?.trim() ?? "General practice";
          const topic = rawTopic.length > 0 ? rawTopic : "General practice";
          const existing = aggregates.get(topic) ?? { attempts: 0, correct: 0, lastActivity: null };
          existing.attempts += 1;
          if ((row as { is_correct?: boolean | null })?.is_correct) {
            existing.correct += 1;
          }
          const createdAt = (row as { created_at?: string | null })?.created_at;
          if (createdAt) {
            const createdDate = new Date(createdAt);
            if (!existing.lastActivity || existing.lastActivity < createdDate) {
              existing.lastActivity = createdDate;
            }
          }
          aggregates.set(topic, existing);
        }

        const insights: TopicInsight[] = Array.from(aggregates.entries()).map(([topic, summary]) => ({
          topic,
          attempts: summary.attempts,
          correct: summary.correct,
          accuracy: summary.attempts > 0 ? Math.round((summary.correct / summary.attempts) * 100) : 0,
          lastActivity: summary.lastActivity
        }));

        insights.sort((a, b) => {
          if (b.attempts === a.attempts) {
            return (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0);
          }
          return b.attempts - a.attempts;
        });

        setTopicInsights(insights);
      } catch {
        if (!active) return;
        setTopicError("Topic insights are unavailable right now.");
        setTopicInsights([]);
      } finally {
        if (!active) return;
        setTopicLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, metricsReloadKey]);

  useEffect(() => {
    if (!copyFeedback) return;
    const timer = setTimeout(() => {
      setCopyFeedback(null);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [copyFeedback]);

  const accuracy = metrics.total_attempts > 0 ? Math.round((metrics.correct_attempts / metrics.total_attempts) * 100) : 0;

  const userMetadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
  const fromMetadata = (key: string) => {
    const value = userMetadata?.[key];
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  const metadataAlias = fromMetadata("alias");
  const metadataName = fromMetadata("full_name") ?? fromMetadata("name");
  const defaultHandle = session?.user?.email ? session.user.email.split("@")[0] : "there";
  const greetingName = aliasLabel ?? metadataAlias ?? metadataName ?? defaultHandle;
  const heroCtaLabel = metrics.total_attempts > 0 ? "Resume practice" : "Start your first quiz";
  const heroSummary =
    metrics.total_attempts > 0
      ? `You've answered ${metrics.total_attempts} questions with ${accuracy}% accuracy.`
      : "Kick off your CHD prep with guided tutor mode sessions.";
  const heroChip =
    metrics.total_attempts > 0
      ? `${metrics.correct_attempts} correct answers logged`
      : "Create momentum with weekly practice";

  const latestTrendPoint = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const weeklyGoalAttempts = 40;
  const weeklyAttempts = latestTrendPoint?.attempts ?? 0;
  const goalProgress = Math.min(1, weeklyAttempts / weeklyGoalAttempts);
  const goalProgressPercent = Math.round(goalProgress * 100);
  const goalStatusMessage =
    weeklyAttempts >= weeklyGoalAttempts
      ? "Goal met—lock in your knowledge with a review session."
      : weeklyAttempts >= weeklyGoalAttempts * 0.5
        ? "You're halfway there. A short quiz will keep the streak alive."
        : "Schedule two quick sessions to close the gap this week.";

  const milestones = [25, 50, 100, 250, 500, 750, 1000];
  const completedMilestone = milestones
    .slice()
    .reverse()
    .find((value) => metrics.total_attempts >= value);
  const nextMilestone = milestones.find((value) => metrics.total_attempts < value) ?? null;
  const milestoneMessage = completedMilestone
    ? `You've crossed ${completedMilestone} total questions—fantastic dedication!`
    : "Your first milestone is 25 total questions. Let's get there!";
  const milestoneNextMessage =
    nextMilestone !== null
      ? `Only ${Math.max(0, nextMilestone - metrics.total_attempts)} more to reach ${nextMilestone}.`
      : "You've completed every milestone we track. Keep leading the pack!";

  const previousTrendPoint = trendData.length > 1 ? trendData[trendData.length - 2] : null;
  const attemptDelta = previousTrendPoint ? weeklyAttempts - previousTrendPoint.attempts : null;
  const attemptDeltaDescription = (() => {
    if (!previousTrendPoint) {
      return "Baseline week captured—future sessions will show weekly change.";
    }
    if (!attemptDelta) {
      return "Matching last week's pace so far.";
    }
    const label = Math.abs(attemptDelta) === 1 ? "attempt" : "attempts";
    const direction = attemptDelta > 0 ? "more" : "fewer";
    return `${Math.abs(attemptDelta)} ${label} ${direction} than last week.`;
  })();

  const latestAccuracyPoint = typeof latestTrendPoint?.accuracy === "number" ? Number(latestTrendPoint.accuracy.toFixed(1)) : null;
  const previousAccuracyPoint = typeof previousTrendPoint?.accuracy === "number"
    ? Number(previousTrendPoint.accuracy.toFixed(1))
    : null;
  const accuracyDelta =
    latestAccuracyPoint !== null && previousAccuracyPoint !== null
      ? Number((latestAccuracyPoint - previousAccuracyPoint).toFixed(1))
      : null;
  const accuracyTrendDescription = (() => {
    if (latestAccuracyPoint === null) {
      return `Lifetime accuracy ${accuracy}%. Log another week to unlock weekly accuracy tracking.`;
    }
    if (accuracyDelta === null) {
      return `Weekly accuracy at ${latestAccuracyPoint.toFixed(1)}%.`;
    }
    if (accuracyDelta === 0) {
      return `Accuracy held steady at ${latestAccuracyPoint.toFixed(1)}%.`;
    }
    const direction = accuracyDelta > 0 ? "up" : "down";
    return `Accuracy ${direction} ${Math.abs(accuracyDelta).toFixed(1)} points versus last week.`;
  })();

  const weeklyStreak = useMemo(() => computeWeeklyStreak(trendData), [trendData]);

  const momentumDescription = weeklyStreak > 0
    ? weeklyStreak >= 3
      ? `You're on a ${weeklyStreak}-week streak—keep it alive with a short session.`
      : `${weeklyStreak}-week streak in progress. Schedule your next quiz to extend it.`
    : "Start a fresh streak with a quick 10-question session.";

  const badges = useMemo(
    () => evaluateBadges({ totalAttempts: metrics.total_attempts, weeklyStreak }),
    [metrics.total_attempts, weeklyStreak]
  );
  const earnedBadges = badges.filter((badge) => badge.earned);
  const nextBadge = badges.find((badge) => !badge.earned) ?? null;
  const badgeUnlockMessage = nextBadge
    ? `Next badge: ${nextBadge.label} (${Math.max(0, nextBadge.progressTarget - Math.floor(nextBadge.progressCurrent))} to go).`
    : "All milestone badges unlocked. Great job!";

  const readinessMessage = (() => {
    if (accuracy >= 85 && goalProgress >= 1) {
      return "On track for exam readiness—consider a timed mock to simulate test day.";
    }
    if (accuracy >= 75 && goalProgress >= 0.75) {
      return "Solid fundamentals. Keep reinforcing weaker topics to push accuracy into the 80s.";
    }
    if (goalProgress < 0.5) {
      return "Focus on consistent weekly practice to build confidence before tackling full-length exams.";
    }
    return "Mix in targeted review sessions to balance speed and accuracy.";
  })();

  const cta = (() => {
    if (metrics.flagged_count > 0) {
      return {
        label: "Review flagged questions",
        description: "Clear out tricky items while the explanations are fresh.",
        href: "/review"
      };
    }
    if (weeklyAttempts < weeklyGoalAttempts) {
      return {
        label: "Schedule a focused quiz",
        description: "A 10-question tutor mode session will nudge you toward this week's goal.",
        href: "/practice"
      };
    }
    return {
      label: "Sharpen with learning games",
      description: "Switch it up with Murmurs, CXR Match, or Read the EKG to reinforce pattern recognition.",
      href: "/games"
    };
  })();

  const narrativeSnapshots = useMemo(
    () => [
      {
        title: "This week vs. goal",
        headline: `${weeklyAttempts} / ${weeklyGoalAttempts} attempts`,
        description: `${goalProgressPercent}% of your goal logged. ${attemptDeltaDescription} ${goalStatusMessage}`.trim()
      },
      {
        title: "Accuracy trend",
        headline: `${latestAccuracyPoint !== null ? latestAccuracyPoint.toFixed(1) : accuracy}%`,
        description: `${accuracyTrendDescription} ${readinessMessage}`.trim()
      },
      {
        title: "Milestone focus",
        headline:
          completedMilestone !== undefined && completedMilestone !== null
            ? `${completedMilestone}+ questions`
            : nextMilestone !== null
              ? `Next: ${nextMilestone}`
              : `${metrics.total_attempts} questions`,
        description: `${milestoneMessage} ${milestoneNextMessage}`.trim()
      }
    ],
    [
      accuracy,
      accuracyTrendDescription,
      attemptDeltaDescription,
      completedMilestone,
      goalProgressPercent,
      goalStatusMessage,
      latestAccuracyPoint,
      milestoneMessage,
      milestoneNextMessage,
      nextMilestone,
      readinessMessage,
      weeklyAttempts,
      weeklyGoalAttempts,
      metrics.total_attempts
    ]
  );

  const strengths = topicInsights
    .filter((topic) => topic.attempts >= 3 && topic.accuracy >= 80)
    .slice(0, 2);
  const growthAreas = topicInsights
    .filter((topic) => topic.attempts >= 2 && topic.accuracy < 70)
    .slice(0, 2);
  const recentTopics = topicInsights.slice(0, 3);

  const reportSummary = useMemo(() => {
    const lines: string[] = [];
    lines.push(
      `Weekly practice: ${weeklyAttempts} of ${weeklyGoalAttempts} attempts (${goalProgressPercent}% of goal). ${attemptDeltaDescription}`.trim()
    );
    lines.push(`${accuracyTrendDescription} ${readinessMessage}`.trim());
    lines.push(`${milestoneMessage} ${milestoneNextMessage}`.trim());
    lines.push(momentumDescription);
    if (strengths.length > 0) {
      const strengthsList = strengths
        .map((topic) => `${topic.topic} (${topic.accuracy}% accuracy)`)
        .join(", ");
      lines.push(`Strength highlights: ${strengthsList}.`);
    }
    if (growthAreas.length > 0) {
      const growthList = growthAreas
        .map((topic) => `${topic.topic} (${topic.accuracy}% accuracy)`)
        .join(", ");
      lines.push(`Focus next: ${growthList}.`);
    }
    lines.push(`Next action: ${cta.label} — ${cta.description}`);
    return lines.join("\n");
  }, [
    accuracyTrendDescription,
    attemptDeltaDescription,
    cta.description,
    cta.label,
    goalProgressPercent,
    growthAreas,
    milestoneMessage,
    milestoneNextMessage,
    momentumDescription,
    readinessMessage,
    strengths,
    weeklyAttempts,
    weeklyGoalAttempts
  ]);

  const reportSummaryParagraphs = useMemo(() => reportSummary.split("\n"), [reportSummary]);

  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopyReport = async () => {
    if (!reportSummary) return;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(reportSummary);
      setCopyFeedback("Shareable summary copied to clipboard.");
    } catch (_error) {
      setCopyFeedback("Copy not supported in this browser. Try printing instead.");
    }
  };

  const handleShareReport = async () => {
    if (!reportSummary) return;
    if (!canUseNativeShare) {
      await handleCopyReport();
      return;
    }
    try {
      await navigator.share({ title: "CHD progress update", text: reportSummary });
      setCopyFeedback("Progress report ready to send.");
    } catch (_error) {
      if (_error instanceof DOMException && _error.name === "AbortError") {
        return;
      }
      setCopyFeedback("Unable to share. Try copying instead.");
    }
  };

  const handlePrintReport = () => {
    if (typeof window === "undefined") return;
    window.print();
    setCopyFeedback("Opened print preview for your report.");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-500 p-6 text-white shadow-sm md:col-span-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25)_0,transparent_55%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              <span className="block h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
              {heroChip}
            </span>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wide text-white/80">Welcome back</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{greetingName}</h1>
            </div>
            <p className="max-w-xl text-sm text-white/80 sm:text-base">{heroSummary}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/practice"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50"
              >
                {heroCtaLabel}
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/games" className="text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
                Explore learning games
              </Link>
            </div>
          </div>
          <dl className="grid min-w-[220px] gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-white/70">Lifetime accuracy</dt>
              <dd className="text-2xl font-semibold text-white">{accuracy}%</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-white/70">Weekly points</dt>
              <dd className="text-2xl font-semibold text-white">{metrics.weekly_points}</dd>
            </div>
          </dl>
        </div>
      </section>
      {aliasNeeded ? (
        <Card className="md:col-span-2" status="info">
          <CardHeader className="border-b border-white/40">
            <CardTitle>Choose your alias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-sky-900">
            <p>
              Set your leaderboard alias in profile settings to participate. Aliases are visible to peers and locked after first
              save.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/profile/alias" className="font-medium text-brand-600 underline">
                Go to alias settings
              </Link>
              <Link to="/leaderboard" className="font-medium text-brand-600 underline">
                View leaderboard guidance
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Your progress</CardTitle>
          <p className="text-sm text-neutral-600">Real-time metrics from tutor mode and learning games.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {metricsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {metricsError}
            </div>
          ) : null}
          {!metricsLoaded && metricsLoading ? (
            <p className="text-sm text-neutral-500">Loading progress…</p>
          ) : (
            <>
              <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-neutral-800">Narrative snapshots</h3>
                  <p className="text-xs text-neutral-500">Quick headlines for this week&rsquo;s progress.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {narrativeSnapshots.map((snapshot) => (
                    <article
                      key={snapshot.title}
                      className="rounded-xl border border-white/60 bg-white p-3 shadow-sm"
                      aria-label={snapshot.title}
                    >
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {snapshot.title}
                      </h4>
                      <p className="text-lg font-semibold text-neutral-900">{snapshot.headline}</p>
                      <p className="text-xs text-neutral-600">{snapshot.description}</p>
                    </article>
                  ))}
                </div>
              </section>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card elevation="flat" interactive status="default" className="p-0">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Practice attempts</dt>
                    <dd className="text-2xl font-semibold text-neutral-900">{metrics.total_attempts}</dd>
                    <p className="text-xs text-neutral-500">{metrics.correct_attempts} correct</p>
                  </CardContent>
                </Card>
                <Card elevation="flat" interactive status="success" className="p-0 text-emerald-900">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Accuracy</dt>
                    <dd className="text-2xl font-semibold">{accuracy}%</dd>
                    <p className="text-xs text-emerald-700/80">Lifetime practice and games.</p>
                  </CardContent>
                </Card>
                <Card elevation="flat" interactive status="warning" className="p-0 text-amber-900">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">Flagged for review</dt>
                    <dd className="text-2xl font-semibold">{metrics.flagged_count}</dd>
                    <p className="text-xs text-amber-700/80">
                      <Link to="/review" className="font-medium underline">
                        Review flagged questions
                      </Link>
                    </p>
                  </CardContent>
                </Card>
                <Card elevation="flat" interactive status="info" className="p-0 text-sky-900">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-sky-700">Weekly points</dt>
                    <dd className="text-2xl font-semibold">{metrics.weekly_points}</dd>
                    <p className="text-xs text-sky-700/80">All-time total: {metrics.all_time_points}</p>
                  </CardContent>
                </Card>
              </dl>
              <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Badges earned</h3>
                  <p className="text-xs text-emerald-700/80">{badgeUnlockMessage}</p>
                </div>
                {earnedBadges.length > 0 ? (
                  <ul className="flex flex-wrap gap-3">
                    {earnedBadges.map((badge) => (
                      <li
                        key={badge.id}
                        className="flex min-w-[11rem] flex-1 items-start gap-3 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 shadow-sm"
                      >
                        <span aria-hidden="true" className="text-xl">
                          {badge.icon}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-emerald-900">{badge.label}</p>
                          <p className="text-xs text-emerald-700/80">{badge.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-800">
                    Answer 50 questions and maintain a 4-week streak to start unlocking badges.
                  </p>
                )}
              </section>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700">Weekly trend (last 8 weeks)</h3>
                <PracticeTrendChart data={trendData} loading={trendLoading} error={trendError} />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 bg-neutral-50 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {metricsError
              ? "Unable to refresh automatically. Try again after checking your connection."
              : "Stats refresh automatically after you answer questions or play games."}
          </span>
          <Button type="button" variant="secondary" onClick={refreshMetrics} disabled={metricsLoading}>
            {metricsLoading ? "Refreshing…" : "Refresh stats"}
          </Button>
      </CardFooter>
    </Card>
    <Card className="md:col-span-2 print:border print:border-transparent print:bg-white print:shadow-none">
      <CardHeader>
        <CardTitle>Shareable progress report</CardTitle>
        <p className="text-sm text-neutral-600">Create an assistive summary to share with mentors or print for study check-ins.</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-neutral-700">
        <section className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Summary preview</h3>
          <div className="space-y-2">
            {reportSummaryParagraphs.map((paragraph, index) => (
              <p key={index} className="text-sm text-neutral-700">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
        <p className="text-xs text-neutral-500">
          This preview mirrors what is copied, shared, or printed so screen readers and collaborators receive the same context.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handlePrintReport}>
            Print progress report
          </Button>
          <Button type="button" variant="secondary" onClick={handleCopyReport}>
            Copy summary
          </Button>
          {canUseNativeShare ? (
            <Button type="button" variant="ghost" onClick={handleShareReport}>
              Share report
            </Button>
          ) : null}
        </div>
        <p className="min-h-[1rem] text-xs text-neutral-500" aria-live="polite" role="status">
          {copyFeedback ?? ""}
        </p>
      </CardFooter>
    </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Personalized insights</CardTitle>
          <p className="text-sm text-neutral-600">Adaptive goals and recommendations based on your recent activity.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-900">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">Weekly goal</h3>
                <p className="text-xs text-brand-700/80">{weeklyAttempts} of {weeklyGoalAttempts} practice attempts logged.</p>
              </div>
              <div className="h-2 w-full rounded-full bg-white/60" role="progressbar" aria-valuenow={goalProgressPercent} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="h-2 rounded-full bg-brand-500 transition-all"
                  style={{
                    width:
                      goalProgressPercent > 0
                        ? `${Math.min(100, Math.max(goalProgressPercent, 6))}%`
                        : "0%"
                  }}
                  aria-hidden="true"
                />
              </div>
              <p>{goalStatusMessage}</p>
            </section>
            <section className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-900">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Milestones</h3>
                <p className="text-xs text-amber-700/80">{milestoneMessage}</p>
              </div>
              <p>
                {milestoneNextMessage}
              </p>
              <p className="text-xs text-amber-700/70">Next celebration unlocks automatically once you cross the threshold.</p>
            </section>
            <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Readiness check</h3>
                <p className="text-xs text-emerald-700/80">Lifetime accuracy {accuracy}%</p>
              </div>
              <p>{readinessMessage}</p>
              <p className="text-xs text-emerald-700/70">Combine high accuracy with steady practice to maximize exam confidence.</p>
            </section>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800">Topic strengths</h3>
                <span className="text-xs text-neutral-500">Last 200 attempts</span>
              </div>
              {topicError ? (
                <p className="text-sm text-red-600">{topicError}</p>
              ) : topicLoading ? (
                <p className="text-sm text-neutral-500">Analyzing your topics…</p>
              ) : strengths.length > 0 ? (
                <ul className="space-y-2 text-sm text-neutral-700">
                  {strengths.map((topic) => (
                    <li key={topic.topic} className="flex items-center justify-between">
                      <span>{topic.topic}</span>
                      <span className="text-xs text-emerald-600">{topic.accuracy}% accuracy</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">Practice a few more questions to unlock personalized strengths.</p>
              )}
            </section>
            <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800">Growth opportunities</h3>
                <span className="text-xs text-neutral-500">Focus for upcoming sessions</span>
              </div>
              {topicError ? (
                <p className="text-sm text-red-600">{topicError}</p>
              ) : topicLoading ? (
                <p className="text-sm text-neutral-500">Surfacing recommendations…</p>
              ) : growthAreas.length > 0 ? (
                <ul className="space-y-2 text-sm text-neutral-700">
                  {growthAreas.map((topic) => (
                    <li key={topic.topic} className="flex items-center justify-between">
                      <span>{topic.topic}</span>
                      <span className="text-xs text-amber-600">{topic.accuracy}% accuracy</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">Your accuracy is balanced. Rotate topics to stay sharp.</p>
              )}
            </section>
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700">Next best action</h3>
              <p className="text-sm text-sky-900">{cta.description}</p>
            </div>
            <Link to={cta.href} className="inline-flex items-center gap-2 self-start rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
              {cta.label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          {recentTopics.length > 0 ? (
            <div className="mt-4 text-xs text-neutral-500">
              Recently practiced topics: {recentTopics.map((topic) => topic.topic).join(", ")}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Next up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-700">
          <p>Practice from a curated set of 250 CHD questions in tutor mode.</p>
          <Link to="/practice" className="text-brand-600 underline">
            Resume practice
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Published content</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-6 text-sm text-neutral-700">
            {featured.map((q) => (
              <li key={q.id}>{q.lead_in ?? "Practice question"}</li>
            ))}
          </ul>
          {loadingFeatured ? <p className="mt-2 text-xs text-neutral-500">Loading fresh questions…</p> : null}
          {featuredError ? <p className="mt-2 text-xs text-red-600">{featuredError}</p> : null}
          {!loadingFeatured && featured.length === 0 && !featuredError ? (
            <p className="mt-2 text-xs text-neutral-500">No published questions yet.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Games</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link to="/games/murmurs" className="rounded-lg border border-neutral-200 p-4 hover:border-brand-500">
            Guess the Murmur →
          </Link>
          <Link to="/games/cxr" className="rounded-lg border border-neutral-200 p-4 hover:border-brand-500">
            CXR Sign Match →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

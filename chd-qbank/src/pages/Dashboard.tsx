import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import type { DashboardMetrics } from "../lib/constants";
import { EMPTY_DASHBOARD_METRICS, fetchDashboardMetrics } from "../lib/dashboard";
import PracticeTrendChart, { type PracticeTrendDatum } from "../components/Charts/PracticeTrendChart";
import { useI18n } from "../i18n";

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
  const { locale, formatMessage, formatNumber } = useI18n();

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

    fetchDashboardMetrics()
      .then((data) => {
        if (!active) return;
        setMetrics(data);
        setMetricsLoaded(true);
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : formatMessage({
                id: "dashboard.progress.loadError",
                defaultMessage: "Unable to load progress."
              });
        setMetrics({ ...EMPTY_DASHBOARD_METRICS });
        setMetricsLoaded(true);
        setMetricsError(message);
      })
      .finally(() => {
        if (!active) return;
        setMetricsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, metricsReloadKey, formatMessage]);

  useEffect(() => {
    setLoadingFeatured(true);
    setFeaturedError(null);
    supabase
      .from("questions")
      .select("id, lead_in")
      .eq("status", "published")
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          setFeaturedError(error.message);
          setFeatured([]);
          return;
        }
        const randomized = shuffle(data ?? []);
        setFeatured(randomized.map((row) => ({ id: row.id, lead_in: row.lead_in })));
      })
      .finally(() => {
        setLoadingFeatured(false);
      });
  }, []);

  const refreshMetrics = () => {
    setMetricsReloadKey((key) => key + 1);
  };

  useEffect(() => {
    if (!session) {
      setTrendData([]);
      setTrendError(null);
      setTrendLoading(false);
      return;
    }

    let active = true;
    setTrendLoading(true);
    setTrendError(null);

    const weeksToShow = 8;
    const toUtcWeekStart = (value: Date): Date => {
      const base = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
      const day = base.getUTCDay();
      const diff = (day + 6) % 7;
      base.setUTCDate(base.getUTCDate() - diff);
      base.setUTCHours(0, 0, 0, 0);
      return base;
    };

    const now = new Date();
    const latestWeek = toUtcWeekStart(now);
    const earliestWeek = new Date(latestWeek);
    earliestWeek.setUTCDate(earliestWeek.getUTCDate() - (weeksToShow - 1) * 7);

    supabase
      .from("responses")
      .select("created_at, is_correct")
      .eq("user_id", session.user.id)
      .gte("created_at", earliestWeek.toISOString())
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setTrendError(
            formatMessage({
              id: "dashboard.trend.error",
              defaultMessage: "We couldn't load your recent practice. Try again shortly."
            })
          );
          setTrendData([]);
          return;
        }

        const aggregates = new Map<string, { attempts: number; correct: number }>();
        for (const row of data ?? []) {
          if (!row?.created_at) continue;
          const createdAt = new Date(row.created_at);
          const weekStart = toUtcWeekStart(createdAt);
          const key = weekStart.toISOString().slice(0, 10);
          const entry = aggregates.get(key) ?? { attempts: 0, correct: 0 };
          entry.attempts += 1;
          if (row.is_correct) entry.correct += 1;
          aggregates.set(key, entry);
        }

        const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
        const points: PracticeTrendDatum[] = [];

        for (let i = 0; i < weeksToShow; i += 1) {
          const cursor = new Date(earliestWeek);
          cursor.setUTCDate(cursor.getUTCDate() + i * 7);
          const key = cursor.toISOString().slice(0, 10);
          const summary = aggregates.get(key) ?? { attempts: 0, correct: 0 };
          const accuracy = summary.attempts > 0 ? (summary.correct / summary.attempts) * 100 : null;
          points.push({
            label: formatter.format(cursor),
            attempts: summary.attempts,
            accuracy
          });
        }

        setTrendData(points);
      })
      .catch(() => {
        if (!active) return;
        setTrendError(
          formatMessage({
            id: "dashboard.trend.error",
            defaultMessage: "We couldn't load your recent practice. Try again shortly."
          })
        );
        setTrendData([]);
      })
      .finally(() => {
        if (!active) return;
        setTrendLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, metricsReloadKey, formatMessage, locale]);

  const accuracyRatio =
    metrics.total_attempts > 0 ? metrics.correct_attempts / metrics.total_attempts : null;
  const accuracyDisplay =
    accuracyRatio !== null
      ? formatNumber(accuracyRatio, { style: "percent", maximumFractionDigits: 0 })
      : formatMessage({ id: "dashboard.metrics.accuracyEmpty", defaultMessage: "–" });

  const userMetadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
  const fromMetadata = (key: string) => {
    const value = userMetadata?.[key];
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  const metadataAlias = fromMetadata("alias");
  const metadataName = fromMetadata("full_name") ?? fromMetadata("name");
  const fallbackGreeting = formatMessage({ id: "dashboard.hero.fallbackName", defaultMessage: "there" });
  const defaultHandle = session?.user?.email ? session.user.email.split("@")[0] : fallbackGreeting;
  const greetingName = aliasLabel ?? metadataAlias ?? metadataName ?? defaultHandle ?? fallbackGreeting;
  const heroCtaLabel =
    metrics.total_attempts > 0
      ? formatMessage({ id: "dashboard.hero.cta.resume", defaultMessage: "Resume practice" })
      : formatMessage({ id: "dashboard.hero.cta.start", defaultMessage: "Start your first quiz" });
  const heroSummary =
    metrics.total_attempts > 0 && accuracyRatio !== null
      ? formatMessage(
          {
            id: "dashboard.hero.summary.metrics",
            defaultMessage:
              "You've answered {questions, number} questions with {accuracy, number, percent} accuracy."
          },
          { questions: metrics.total_attempts, accuracy: accuracyRatio }
        )
      : formatMessage({
          id: "dashboard.hero.summary.start",
          defaultMessage: "Kick off your CHD prep with guided tutor mode sessions."
        });
  const heroChip =
    metrics.total_attempts > 0
      ? formatMessage(
          {
            id: "dashboard.hero.chip.progress",
            defaultMessage: "{count, number} correct answers logged"
          },
          { count: metrics.correct_attempts }
        )
      : formatMessage({
          id: "dashboard.hero.chip.momentum",
          defaultMessage: "Create momentum with weekly practice"
        });

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
              <p className="text-sm uppercase tracking-wide text-white/80">
                {formatMessage({ id: "dashboard.hero.welcome", defaultMessage: "Welcome back" })}
              </p>
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
                {formatMessage({ id: "dashboard.hero.exploreGames", defaultMessage: "Explore learning games" })}
              </Link>
            </div>
          </div>
          <dl className="grid min-w-[220px] gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-white/70">
                {formatMessage({ id: "dashboard.hero.lifetimeAccuracy", defaultMessage: "Lifetime accuracy" })}
              </dt>
              <dd className="text-2xl font-semibold text-white">{accuracyDisplay}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-white/70">
                {formatMessage({ id: "dashboard.hero.weeklyPoints", defaultMessage: "Weekly points" })}
              </dt>
              <dd className="text-2xl font-semibold text-white">{formatNumber(metrics.weekly_points)}</dd>
            </div>
          </dl>
        </div>
      </section>
      {aliasNeeded ? (
        <Card className="md:col-span-2" status="info">
          <CardHeader className="border-b border-white/40">
            <CardTitle>
              {formatMessage({ id: "dashboard.alias.title", defaultMessage: "Choose your alias" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-sky-900">
            <p>
              {formatMessage({
                id: "dashboard.alias.description",
                defaultMessage:
                  "Set your leaderboard alias in profile settings to participate. Aliases are visible to peers and locked after first save."
              })}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/profile/alias" className="font-medium text-brand-600 underline">
                {formatMessage({ id: "dashboard.alias.link.settings", defaultMessage: "Go to alias settings" })}
              </Link>
              <Link to="/leaderboard" className="font-medium text-brand-600 underline">
                {formatMessage({ id: "dashboard.alias.link.leaderboard", defaultMessage: "View leaderboard guidance" })}
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{formatMessage({ id: "dashboard.progress.title", defaultMessage: "Your progress" })}</CardTitle>
          <p className="text-sm text-neutral-600">
            {formatMessage({
              id: "dashboard.progress.subtitle",
              defaultMessage: "Real-time metrics from tutor mode and learning games."
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {metricsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {metricsError}
            </div>
          ) : null}
          {!metricsLoaded && metricsLoading ? (
            <p className="text-sm text-neutral-500">
              {formatMessage({ id: "dashboard.progress.loading", defaultMessage: "Loading progress…" })}
            </p>
          ) : (
            <>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card elevation="flat" interactive status="default" className="p-0">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {formatMessage({ id: "dashboard.metrics.attempts", defaultMessage: "Practice attempts" })}
                    </dt>
                    <dd className="text-2xl font-semibold text-neutral-900">{formatNumber(metrics.total_attempts)}</dd>
                    <p className="text-xs text-neutral-500">
                      {formatMessage(
                        {
                          id: "dashboard.metrics.correctCount",
                          defaultMessage: "{count, number} correct"
                        },
                        { count: metrics.correct_attempts }
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card elevation="flat" interactive status="success" className="p-0 text-emerald-900">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {formatMessage({ id: "dashboard.metrics.accuracyLabel", defaultMessage: "Accuracy" })}
                    </dt>
                    <dd className="text-2xl font-semibold">{accuracyDisplay}</dd>
                    <p className="text-xs text-emerald-700/80">
                      {formatMessage({ id: "dashboard.metrics.accuracyHint", defaultMessage: "Lifetime practice and games." })}
                    </p>
                  </CardContent>
                </Card>
                <Card elevation="flat" interactive status="warning" className="p-0 text-amber-900">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {formatMessage({ id: "dashboard.metrics.flagged", defaultMessage: "Flagged for review" })}
                    </dt>
                    <dd className="text-2xl font-semibold">{formatNumber(metrics.flagged_count)}</dd>
                    <p className="text-xs text-amber-700/80">
                      <Link to="/review" className="font-medium underline">
                        {formatMessage({ id: "dashboard.metrics.flaggedLink", defaultMessage: "Review flagged questions" })}
                      </Link>
                    </p>
                  </CardContent>
                </Card>
                <Card elevation="flat" interactive status="info" className="p-0 text-sky-900">
                  <CardContent className="space-y-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                      {formatMessage({ id: "dashboard.metrics.weeklyPoints", defaultMessage: "Weekly points" })}
                    </dt>
                    <dd className="text-2xl font-semibold">{formatNumber(metrics.weekly_points)}</dd>
                    <p className="text-xs text-sky-700/80">
                      {formatMessage(
                        {
                          id: "dashboard.metrics.weeklyPointsTotal",
                          defaultMessage: "All-time total: {count, number}"
                        },
                        { count: metrics.all_time_points }
                      )}
                    </p>
                  </CardContent>
                </Card>
              </dl>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700">
                  {formatMessage({ id: "dashboard.metrics.trendTitle", defaultMessage: "Weekly trend (last 8 weeks)" })}
                </h3>
                <PracticeTrendChart data={trendData} loading={trendLoading} error={trendError} />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 bg-neutral-50 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {metricsError
              ? formatMessage({
                  id: "dashboard.metrics.refreshError",
                  defaultMessage: "Unable to refresh automatically. Try again after checking your connection."
                })
              : formatMessage({
                  id: "dashboard.metrics.refreshHint",
                  defaultMessage: "Stats refresh automatically after you answer questions or play games."
                })}
          </span>
          <Button type="button" variant="secondary" onClick={refreshMetrics} disabled={metricsLoading}>
            {metricsLoading
              ? formatMessage({ id: "dashboard.metrics.refreshing", defaultMessage: "Refreshing…" })
              : formatMessage({ id: "dashboard.metrics.refreshAction", defaultMessage: "Refresh stats" })}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{formatMessage({ id: "dashboard.nextUp.title", defaultMessage: "Next up" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-700">
          <p>
            {formatMessage({
              id: "dashboard.nextUp.description",
              defaultMessage: "Practice from a curated set of 250 CHD questions in tutor mode."
            })}
          </p>
          <Link to="/practice" className="text-brand-600 underline">
            {formatMessage({ id: "dashboard.nextUp.cta", defaultMessage: "Resume practice" })}
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{formatMessage({ id: "dashboard.published.title", defaultMessage: "Published content" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-6 text-sm text-neutral-700">
            {featured.map((q) => (
              <li key={q.id}>{q.lead_in ?? formatMessage({ id: "dashboard.published.fallback", defaultMessage: "Practice question" })}</li>
            ))}
          </ul>
          {loadingFeatured ? (
            <p className="mt-2 text-xs text-neutral-500">
              {formatMessage({ id: "dashboard.published.loading", defaultMessage: "Loading fresh questions…" })}
            </p>
          ) : null}
          {featuredError ? <p className="mt-2 text-xs text-red-600">{featuredError}</p> : null}
          {!loadingFeatured && featured.length === 0 && !featuredError ? (
            <p className="mt-2 text-xs text-neutral-500">
              {formatMessage({ id: "dashboard.published.empty", defaultMessage: "No published questions yet." })}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{formatMessage({ id: "dashboard.games.title", defaultMessage: "Games" })}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link to="/games/murmurs" className="rounded-lg border border-neutral-200 p-4 hover:border-brand-500">
            {formatMessage({ id: "dashboard.games.murmur", defaultMessage: "Guess the Murmur" })} →
          </Link>
          <Link to="/games/cxr" className="rounded-lg border border-neutral-200 p-4 hover:border-brand-500">
            {formatMessage({ id: "dashboard.games.cxr", defaultMessage: "CXR Sign Match" })} →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import type { DashboardMetrics } from "../lib/constants";
import { EMPTY_DASHBOARD_METRICS, fetchDashboardMetrics } from "../lib/dashboard";
import PracticeTrendChart, { type PracticeTrendDatum } from "../components/Charts/PracticeTrendChart";

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
          return;
        }
        if (data && (!data.alias || data.alias.trim().length === 0)) {
          setAliasNeeded(true);
        } else {
          setAliasNeeded(false);
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
        const message = error instanceof Error ? error.message : "Unable to load progress.";
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
  }, [session, metricsReloadKey]);

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
          setTrendError("We couldn't load your recent practice. Try again shortly.");
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

        const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
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
        setTrendError("We couldn't load your recent practice. Try again shortly.");
        setTrendData([]);
      })
      .finally(() => {
        if (!active) return;
        setTrendLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, metricsReloadKey]);

  const accuracy = metrics.total_attempts > 0 ? Math.round((metrics.correct_attempts / metrics.total_attempts) * 100) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {aliasNeeded ? (
        <Card className="md:col-span-2 border-brand-200 bg-brand-50">
          <CardHeader>
            <CardTitle>Choose your alias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>
              Set your leaderboard alias in profile settings to participate. Aliases are visible to peers and locked after first
              save.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/profile/alias" className="text-brand-600 underline">
                Go to alias settings
              </Link>
              <Link to="/leaderboard" className="text-brand-600 underline">
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
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Practice attempts</dt>
                  <dd className="mt-2 text-2xl font-semibold text-neutral-900">{metrics.total_attempts}</dd>
                  <p className="mt-1 text-xs text-neutral-500">{metrics.correct_attempts} correct</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Accuracy</dt>
                  <dd className="mt-2 text-2xl font-semibold text-neutral-900">{accuracy}%</dd>
                  <p className="mt-1 text-xs text-neutral-500">
                    Based on your lifetime practice and game attempts.
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Flagged for review</dt>
                  <dd className="mt-2 text-2xl font-semibold text-neutral-900">{metrics.flagged_count}</dd>
                  <p className="mt-1 text-xs text-neutral-500">
                    <Link to="/review" className="underline">
                      Review flagged questions
                    </Link>
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Weekly points</dt>
                  <dd className="mt-2 text-2xl font-semibold text-neutral-900">{metrics.weekly_points}</dd>
                  <p className="mt-1 text-xs text-neutral-500">All-time total: {metrics.all_time_points}</p>
                </div>
              </dl>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700">Weekly trend (last 8 weeks)</h3>
                <PracticeTrendChart data={trendData} loading={trendLoading} error={trendError} />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
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

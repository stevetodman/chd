import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";
import type { DashboardMetrics } from "../lib/constants";
import { EMPTY_DASHBOARD_METRICS, fetchDashboardMetrics } from "../lib/dashboard";
import { classNames } from "../lib/utils";

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

  const firstName = (() => {
    const metadataName = session?.user.user_metadata?.full_name as string | undefined;
    if (metadataName) return metadataName.split(" ")[0] ?? metadataName;
    const email = session?.user.email ?? "";
    if (email.includes("@")) return email.split("@")[0];
    return "there";
  })();

  const accuracy = metrics.total_attempts > 0 ? Math.round((metrics.correct_attempts / metrics.total_attempts) * 100) : null;
  const accuracyTone: MetricTone = accuracy === null ? "neutral" : accuracy >= 85 ? "success" : accuracy >= 60 ? "brand" : "warning";
  const accuracySummary =
    accuracy === null
      ? "Answer your first question to see accuracy trends."
      : accuracy >= 85
        ? "Excellent retention—keep the streak alive."
        : accuracy >= 60
          ? "Solid progress. Review flagged items to tighten mastery."
          : "Focus on explanations and spaced review to raise your score.";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 p-8 text-white shadow-lg">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Welcome back</p>
          <h1 className="text-3xl font-bold leading-tight">Keep building your CHD mastery, {firstName}.</h1>
          <p className="text-base text-white/80">
            We saved your place in tutor mode and surfaced the next best actions below.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/practice" className={primaryHeroButtonClass}>
              Resume practice
            </Link>
            <Link to="/review" className={secondaryHeroButtonClass}>
              Review flagged
            </Link>
          </div>
        </div>
        {aliasNeeded ? (
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white/15 p-4 text-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">!</span>
            <div className="space-y-1">
              <p className="font-medium">Choose your leaderboard alias to appear to classmates.</p>
              <div className="flex flex-wrap gap-3 text-white/90">
                <Link to="/profile/alias" className="underline">
                  Set alias now
                </Link>
                <Link to="/leaderboard" className="underline">
                  See leaderboard tips
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute -right-8 -top-8 hidden h-56 w-56 rounded-full border border-white/30 opacity-70 lg:block" />
        <div className="pointer-events-none absolute -bottom-24 right-12 hidden h-64 w-64 rounded-full border border-white/20 opacity-60 lg:block" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 border-b border-neutral-100 bg-neutral-50/60">
            <CardTitle className="text-xl">Your progress</CardTitle>
            <CardDescription>Snapshot from tutor mode, games, and spaced review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {metricsError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                {metricsError}
              </div>
            ) : null}
            {!metricsLoaded && metricsLoading ? (
              <MetricsSkeleton />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="flex flex-col justify-between rounded-2xl bg-brand-50 p-6">
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
                    <AccuracyGauge value={accuracy} tone={accuracyTone} />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Accuracy</p>
                      <p className="text-sm text-neutral-600">{accuracySummary}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricTile
                    label="Practice attempts"
                    value={metrics.total_attempts.toLocaleString()}
                    helper={`${metrics.correct_attempts.toLocaleString()} correct`}
                    tone="neutral"
                  />
                  <MetricTile
                    label="Flagged for review"
                    value={metrics.flagged_count.toLocaleString()}
                    helper={
                      metrics.flagged_count > 0
                        ? "Plan a review session to close the loop."
                        : "Nothing queued—flag challenging items as you go."
                    }
                    tone={metrics.flagged_count > 0 ? "warning" : "success"}
                    action={
                      <Link to="/review" className="text-sm font-medium text-brand-600 underline">
                        Open review
                      </Link>
                    }
                  />
                  <MetricTile
                    label="Weekly points"
                    value={metrics.weekly_points.toLocaleString()}
                    helper={`All-time points: ${metrics.all_time_points.toLocaleString()}`}
                    tone="brand"
                  />
                  <MetricTile
                    label="Consistency"
                    value={consistencyCopy(metrics.total_attempts)}
                    helper="Stay consistent—daily practice compounds."
                    tone="neutral"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {metricsError
                ? "Unable to refresh automatically. Try again after checking your connection."
                : "Stats refresh automatically after each saved response."}
            </span>
            <Button type="button" variant="secondary" onClick={refreshMetrics} disabled={metricsLoading}>
              {metricsLoading ? "Refreshing…" : "Refresh stats"}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Next up</CardTitle>
              <CardDescription>Jump back into tutor mode where you left off.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-neutral-600">Curated CHD scenarios matched to your level.</p>
              <Link to="/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
                Resume practice<span aria-hidden="true">→</span>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Published content</CardTitle>
              <CardDescription>Fresh questions from faculty.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingFeatured ? <FeaturedSkeleton /> : null}
              {featuredError ? (
                <p className="text-sm text-rose-600">{featuredError}</p>
              ) : null}
              {!loadingFeatured && !featuredError ? (
                <ul className="space-y-3">
                  {featured.slice(0, 4).map((q) => (
                    <li key={q.id} className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
                      {q.lead_in ?? "Practice question"}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!loadingFeatured && featured.length === 0 && !featuredError ? (
                <p className="text-sm text-neutral-500">No published questions yet. Check back soon!</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-2 border-b border-neutral-100 bg-neutral-50/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Games</CardTitle>
              <CardDescription>Sharpen pattern recognition with quick challenges.</CardDescription>
            </div>
            <div className="text-xs text-neutral-500">Earn bonus points for streaks and perfect rounds.</div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <GameTile
              title="Guess the Murmur"
              description="Match audio clips to classic murmurs."
              to="/games/murmurs"
            />
            <GameTile
              title="CXR Sign Match"
              description="Identify radiographic signs from curated films."
              to="/games/cxr"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function consistencyCopy(totalAttempts: number) {
  if (totalAttempts === 0) return "Just getting started";
  if (totalAttempts < 25) return "Building momentum";
  if (totalAttempts < 100) return "Consistent practice";
  return "Seasoned learner";
}

type MetricTone = "success" | "warning" | "neutral" | "brand";

function MetricTile({
  label,
  value,
  helper,
  tone,
  action
}: {
  label: string;
  value: string;
  helper: string;
  tone: MetricTone;
  action?: ReactNode;
}) {
  const toneClasses: Record<MetricTone, string> = {
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    neutral: "border-neutral-200 bg-neutral-50",
    brand: "border-brand-200 bg-brand-50"
  };
  return (
    <div className={classNames("flex h-full flex-col justify-between rounded-2xl border p-4", toneClasses[tone])}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="mt-1 text-xs text-neutral-600">{helper}</p>
      </div>
      {action ? <div className="mt-4 text-xs">{action}</div> : null}
    </div>
  );
}

function AccuracyGauge({ value, tone }: { value: number | null; tone: MetricTone }) {
  const displayValue = value ?? 0;
  const bounded = Math.max(0, Math.min(displayValue, 100));
  const accent = tone === "warning" ? "#f59e0b" : tone === "success" ? "#059669" : tone === "brand" ? "#2563eb" : "#6b7280";
  const track = "rgba(37, 99, 235, 0.12)";
  const background = `conic-gradient(${accent} ${bounded * 3.6}deg, ${track} 0deg)`;

  return (
    <div className="relative h-40 w-40">
      <div className="absolute inset-0 rounded-full" style={{ background }} aria-hidden="true" />
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-neutral-900 shadow">
        <span className="text-3xl font-bold">{value !== null ? `${bounded}%` : "—"}</span>
        <span className="text-xs font-medium text-neutral-500">Lifetime accuracy</span>
      </div>
      <span className="sr-only">Lifetime accuracy {value !== null ? `${bounded}%` : "not yet available"}</span>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="rounded-2xl bg-neutral-100 p-6">
        <div className="mx-auto h-40 w-40 animate-pulse rounded-full bg-neutral-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
      ))}
    </div>
  );
}

function GameTile({ title, description, to }: { title: string; description: string; to: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
        Play now<span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

const heroButtonBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-lg shadow-black/10 transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-500";

const primaryHeroButtonClass = classNames(heroButtonBase, "bg-white text-brand-600 hover:bg-brand-50");
const secondaryHeroButtonClass = classNames(heroButtonBase, "bg-brand-500/30 text-white hover:bg-brand-500/40");

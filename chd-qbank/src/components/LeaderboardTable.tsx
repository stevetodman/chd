import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PageState from "./PageState";
import { Button } from "./ui/Button";
import { useSessionStore } from "../lib/auth";
import { classNames } from "../lib/utils";
import { Select } from "./ui/Select";
import { useI18n } from "../i18n";

type Filter = "weekly" | "monthly" | "all";
type SortKey = "points" | "accuracy" | "recent";
type SortOption = `${SortKey}-${"asc" | "desc"}`;

type AliasRelation = { alias: string | null } | null;

type LeaderboardRowWithAlias = {
  points: number | null;
  user_id: string;
  public_aliases?: AliasRelation | AliasRelation[];
};

type LeaderRow = {
  alias: string;
  points: number;
  userId: string;
  lastAwardedAt: string | null;
  accuracy: number | null;
  attempts: number;
  rank: number;
};

type Standing = {
  rank: number;
  points: number;
  nextGap: number | null;
  withinTop: boolean;
};

type TimeframeBounds = {
  startIso: string | null;
  endIso: string | null;
};

const sortChoices: Array<{ value: SortOption; label: string }> = [
  { value: "points-desc", label: "Points (high to low)" },
  { value: "points-asc", label: "Points (low to high)" },
  { value: "accuracy-desc", label: "Accuracy (high to low)" },
  { value: "accuracy-asc", label: "Accuracy (low to high)" },
  { value: "recent-desc", label: "Last point (newest)" },
  { value: "recent-asc", label: "Last point (oldest)" }
];

const RELATIVE_TIME_FALLBACK_LOCALE = "en";

const relativeTimeFormatterCache = new Map<string, Intl.RelativeTimeFormat>();

const getRelativeTimeFormatter = (locale: string) => {
  const normalized = locale || RELATIVE_TIME_FALLBACK_LOCALE;
  const cached = relativeTimeFormatterCache.get(normalized);
  if (cached) {
    return cached;
  }

  try {
    const formatter = new Intl.RelativeTimeFormat(normalized, { numeric: "auto" });
    relativeTimeFormatterCache.set(normalized, formatter);
    return formatter;
  } catch {
    if (normalized !== RELATIVE_TIME_FALLBACK_LOCALE) {
      return getRelativeTimeFormatter(RELATIVE_TIME_FALLBACK_LOCALE);
    }

    const fallbackFormatter = new Intl.RelativeTimeFormat(RELATIVE_TIME_FALLBACK_LOCALE, { numeric: "auto" });
    relativeTimeFormatterCache.set(RELATIVE_TIME_FALLBACK_LOCALE, fallbackFormatter);
    return fallbackFormatter;
  }
};

const resolveAlias = (relation: LeaderboardRowWithAlias["public_aliases"]) => {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    return relation[0]?.alias ?? null;
  }
  return relation.alias ?? null;
};

const getInitials = (alias: string) => {
  if (!alias) return "?";
  const parts = alias.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

const getUtcStartOfWeek = () => {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utcDate.getUTCDay();
  const diff = (day + 6) % 7; // Align to Monday start like date_trunc('week')
  utcDate.setUTCDate(utcDate.getUTCDate() - diff);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
};

const getTimeframeBounds = (filter: Filter): TimeframeBounds => {
  if (filter === "weekly") {
    const start = getUtcStartOfWeek();
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  if (filter === "monthly") {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  return { startIso: null, endIso: null };
};

export const formatRelativeTimeFromNow = (isoDate: string | null, locale: string) => {
  if (!isoDate) return "—";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "—";
  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();

  const thresholds: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [1000 * 60, "second"],
    [1000 * 60 * 60, "minute"],
    [1000 * 60 * 60 * 24, "hour"],
    [1000 * 60 * 60 * 24 * 7, "day"],
    [1000 * 60 * 60 * 24 * 30, "week"],
    [Number.POSITIVE_INFINITY, "month"]
  ];

  for (const [threshold, unit] of thresholds) {
    if (Math.abs(diffMs) < threshold) {
      const divisor =
        unit === "second"
          ? 1000
          : unit === "minute"
            ? 1000 * 60
            : unit === "hour"
              ? 1000 * 60 * 60
              : unit === "day"
                ? 1000 * 60 * 60 * 24
                : unit === "week"
                  ? 1000 * 60 * 60 * 24 * 7
                  : 1000 * 60 * 60 * 24 * 30;
      return getRelativeTimeFormatter(locale).format(Math.round(diffMs / divisor), unit);
    }
  }

  const years = diffMs / (1000 * 60 * 60 * 24 * 365);
  return getRelativeTimeFormatter(locale).format(Math.round(years), "year");
};

type TimeframeQuery<T> = {
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
};

const applyTimeframeFilter = <T extends TimeframeQuery<T>>(query: T, column: string, bounds: TimeframeBounds): T => {
  let nextQuery = query;
  if (bounds.startIso) {
    nextQuery = nextQuery.gte(column, bounds.startIso);
  }
  if (bounds.endIso) {
    nextQuery = nextQuery.lt(column, bounds.endIso);
  }
  return nextQuery;
};

const normalizeForSort = (value: number | null, direction: "asc" | "desc") => {
  if (value === null || Number.isNaN(value)) {
    return direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return value;
};

const normalizeDateForSort = (value: string | null, direction: "asc" | "desc") => {
  if (!value) {
    return direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return timestamp;
};

const sortRows = (rows: LeaderRow[], option: SortOption) => {
  const [key, direction] = option.split("-") as [SortKey, "asc" | "desc"];
  const sorted = [...rows];

  sorted.sort((a, b) => {
    if (key === "points") {
      return direction === "asc" ? a.points - b.points : b.points - a.points;
    }
    if (key === "accuracy") {
      const aValue = normalizeForSort(a.accuracy, direction);
      const bValue = normalizeForSort(b.accuracy, direction);
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const aTime = normalizeDateForSort(a.lastAwardedAt, direction);
    const bTime = normalizeDateForSort(b.lastAwardedAt, direction);
    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });

  return sorted;
};

const fetchAliases = async (userIds: string[]) => {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase
    .from("public_aliases")
    .select("user_id, alias")
    .in("user_id", userIds);

  if (error) throw error;

  for (const row of data ?? []) {
    if (row.alias) {
      map.set(row.user_id, row.alias);
    }
  }

  return map;
};

const fetchMeta = async (userIds: string[], bounds: TimeframeBounds) => {
  const map = new Map<string, { lastAwardedAt: string | null; correct: number; attempts: number }>();
  if (userIds.length === 0) return map;

  const activityQuery = applyTimeframeFilter(
    supabase
      .from("leaderboard_events")
      .select("user_id, last_awarded_at:max(created_at)", { group: "user_id" })
      .in("user_id", userIds),
    "created_at",
    bounds
  );

  const accuracyQuery = applyTimeframeFilter(
    supabase
      .from("answer_events")
      .select("user_id, correct:sum(points), attempts:count()", { group: "user_id" })
      .in("user_id", userIds),
    "effective_at",
    bounds
  );

  const [activityResult, accuracyResult] = await Promise.all([activityQuery, accuracyQuery]);

  if (activityResult.error) throw activityResult.error;
  if (accuracyResult.error) throw accuracyResult.error;

  for (const row of activityResult.data ?? []) {
    map.set(row.user_id, {
      lastAwardedAt: row.last_awarded_at ?? null,
      correct: 0,
      attempts: 0
    });
  }

  for (const row of accuracyResult.data ?? []) {
    const existing = map.get(row.user_id) ?? { lastAwardedAt: null, correct: 0, attempts: 0 };
    map.set(row.user_id, {
      lastAwardedAt: existing.lastAwardedAt,
      correct: Number(row.correct ?? 0),
      attempts: Number(row.attempts ?? 0)
    });
  }

  return map;
};

const filterLabels: Record<Filter, string> = {
  weekly: "This week",
  monthly: "This month",
  all: "All-time"
};

const accuracyTooltip = (attempts: number, accuracy: number | null) => {
  if (accuracy === null || attempts === 0) return undefined;
  return `${accuracy}% accuracy across ${attempts} tracked attempts`;
};

export default function LeaderboardTable() {
  const [baseRows, setBaseRows] = useState<LeaderRow[]>([]);
  const [filter, setFilter] = useState<Filter>("weekly");
  const [sortOption, setSortOption] = useState<SortOption>("points-desc");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [standingLoading, setStandingLoading] = useState(false);
  const { session } = useSessionStore();
  const { locale } = useI18n();

  const displayRows = useMemo(() => sortRows(baseRows, sortOption), [baseRows, sortOption]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const bounds = getTimeframeBounds(filter);
        let baseData: Array<{ user_id: string; points: number; alias: string | null }> = [];

        if (filter === "weekly") {
          const { data, error: weeklyError } = await supabase
            .from("leaderboard_weekly")
            .select("points, user_id, public_aliases(alias)")
            .order("points", { ascending: false })
            .limit(100);

          if (weeklyError) throw weeklyError;

          const rowsWithAliases = (data ?? []) as LeaderboardRowWithAlias[];
          baseData = rowsWithAliases.map((row) => ({
            user_id: row.user_id,
            points: Number(row.points ?? 0),
            alias: resolveAlias(row.public_aliases)
          }));
        } else if (filter === "all") {
          const { data, error: allTimeError } = await supabase
            .from("leaderboard")
            .select("points, user_id, public_aliases(alias)")
            .order("points", { ascending: false })
            .limit(100);

          if (allTimeError) throw allTimeError;

          const rowsWithAliases = (data ?? []) as LeaderboardRowWithAlias[];
          baseData = rowsWithAliases.map((row) => ({
            user_id: row.user_id,
            points: Number(row.points ?? 0),
            alias: resolveAlias(row.public_aliases)
          }));
        } else {
          const monthlyQuery = applyTimeframeFilter(
            supabase
              .from("leaderboard_events")
              .select("user_id, points:count()", { group: "user_id" }),
            "created_at",
            bounds
          )
            .order("points", { ascending: false })
            .limit(100);

          const { data, error: monthlyError } = await monthlyQuery;

          if (monthlyError) throw monthlyError;

          baseData = (data ?? []).map((row: { user_id: string; points: number }) => ({
            user_id: row.user_id,
            points: Number(row.points ?? 0),
            alias: null
          }));
        }

        if (!active) return;

        const userIds = baseData.map((row) => row.user_id);

        const [aliasResult, metaResult] = await Promise.allSettled([
          fetchAliases(userIds),
          fetchMeta(userIds, bounds)
        ]);

        if (!active) return;

        const aliasMap = aliasResult.status === "fulfilled" ? aliasResult.value : new Map<string, string>();
        if (aliasResult.status === "rejected") {
          console.error(aliasResult.reason);
        }

        const metaMap = metaResult.status === "fulfilled" ? metaResult.value : new Map<string, { lastAwardedAt: string | null; correct: number; attempts: number }>();
        if (metaResult.status === "rejected") {
          console.error(metaResult.reason);
        }

        const mapped: LeaderRow[] = baseData.map((row, index) => {
          const alias = aliasMap.get(row.user_id) ?? row.alias ?? "Anon";
          const meta = metaMap.get(row.user_id);
          const attempts = meta?.attempts ?? 0;
          const accuracy = attempts > 0 ? Math.round((meta!.correct / attempts) * 1000) / 10 : null;
          return {
            alias: alias || "Anon",
            points: Number(row.points ?? 0),
            userId: row.user_id,
            lastAwardedAt: meta?.lastAwardedAt ?? null,
            accuracy,
            attempts,
            rank: index + 1
          };
        });

        setBaseRows(mapped);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setBaseRows([]);
        setError("We couldn't load the leaderboard. Please try again.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  useEffect(() => {
    if (!session) {
      setStanding(null);
      setStandingLoading(false);
      return;
    }

    const userId = session.user.id;
    const topMatch = baseRows.find((row) => row.userId === userId) ?? null;

    setStandingLoading(true);

    const computeStanding = async () => {
      try {
        if (topMatch) {
          const previous = topMatch.rank > 1 ? baseRows[topMatch.rank - 2] : null;
          setStanding({
            rank: topMatch.rank,
            points: topMatch.points,
            nextGap: previous ? Math.max(0, previous.points - topMatch.points) : null,
            withinTop: true
          });
          return;
        }

        if (filter === "monthly") {
          setStanding(null);
          return;
        }

        const source = filter === "weekly" ? "leaderboard_weekly" : "leaderboard";

        const { data: selfRow, error: selfError } = await supabase
          .from(source)
          .select("points")
          .eq("user_id", userId)
          .maybeSingle();

        if (selfError || !selfRow) {
          setStanding(null);
          return;
        }

        const selfPoints = Number(selfRow.points ?? 0);

        const { count } = await supabase
          .from(source)
          .select("user_id", { count: "exact", head: true })
          .gt("points", selfPoints);

        let nextGap: number | null = null;

        const { data: nextRow } = await supabase
          .from(source)
          .select("points")
          .gt("points", selfPoints)
          .order("points", { ascending: true })
          .limit(1);

        if (nextRow && nextRow.length > 0) {
          const nextPoints = Number(nextRow[0]?.points ?? 0);
          nextGap = Math.max(0, nextPoints - selfPoints);
        }

        setStanding({
          rank: (count ?? 0) + 1,
          points: selfPoints,
          nextGap,
          withinTop: false
        });
      } finally {
        setStandingLoading(false);
      }
    };

    void computeStanding();
  }, [session, baseRows, filter, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Button variant={filter === "weekly" ? "primary" : "secondary"} onClick={() => setFilter("weekly")}>Weekly</Button>
          <Button variant={filter === "monthly" ? "primary" : "secondary"} onClick={() => setFilter("monthly")}>Monthly</Button>
          <Button variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>All-time</Button>
        </div>
        <div className="md:w-64">
          <Select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            aria-label="Sort leaderboard"
          >
            {sortChoices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <div className="flex items-start justify-between gap-4">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
              Try again
            </Button>
          </div>
        </div>
      ) : null}
      {loading && baseRows.length === 0 ? (
        <PageState title="Loading leaderboard" description="Fetching the latest rankings." fullHeight />
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 overflow-hidden rounded-lg bg-white shadow-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Accuracy</th>
              <th className="px-4 py-3 text-right">Last point</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-sm">
            {displayRows.map((row) => {
              const isCurrentUser = session?.user.id === row.userId;
              return (
                <tr
                  key={`${row.userId}-${row.rank}`}
                  className={classNames(isCurrentUser && "bg-brand-50")}
                  data-current-user={isCurrentUser ? "true" : undefined}
                >
                  <td className="px-4 py-3 text-neutral-500">{row.rank}</td>
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold uppercase text-neutral-700">
                        {getInitials(row.alias)}
                      </span>
                      <span className="flex items-center gap-2">
                        {row.alias}
                        {isCurrentUser ? (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">You</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{row.points}</td>
                  <td
                    className="px-4 py-3 text-right"
                    title={accuracyTooltip(row.attempts, row.accuracy)}
                  >
                    {row.accuracy !== null ? `${row.accuracy.toFixed(1)}%` : "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-neutral-500"
                    title={
                      row.lastAwardedAt ? new Date(row.lastAwardedAt).toLocaleString(locale) : undefined
                    }
                  >
                    {formatRelativeTimeFromNow(row.lastAwardedAt, locale)}
                  </td>
                </tr>
              );
            })}
            {displayRows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                  No leaderboard entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {session ? (
        standing ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">{filterLabels[filter]} rank #{standing.rank}</p>
            <p className="mt-1">
              {standing.points} pts
              {standing.nextGap !== null
                ? ` · ${standing.nextGap} pts to move up`
                : " · You’re leading this board"}
              {standing.withinTop
                ? " — highlighted above."
                : " — you’re currently outside the top 100."}
            </p>
          </div>
        ) : standingLoading ? (
          <p className="text-xs text-neutral-500">Checking your standing…</p>
        ) : filter === "monthly" ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-semibold">Monthly standings only show the top 100 learners.</p>
            <p className="mt-1">Keep earning points this month to appear on the board.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-semibold">You haven’t earned leaderboard points yet.</p>
            <p className="mt-1">Answer questions in practice mode to climb the rankings.</p>
          </div>
        )
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <p className="font-semibold">Sign in to see your standing.</p>
          <p className="mt-1">Leaderboard position is available once you’re logged in.</p>
        </div>
      )}
      <section className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <h2 className="text-sm font-semibold text-neutral-900">How points work</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Earn 1 point for each correct practice question, Murmur item, or CXR case on your first correct attempt.</li>
          <li>Weekly rankings reset every Monday, monthly rankings track the current calendar month, and all-time totals never reset.</li>
          <li>The board refreshes whenever you reopen it or press “Try again,” and new points appear moments after you earn them.</li>
        </ul>
      </section>
    </div>
  );
}

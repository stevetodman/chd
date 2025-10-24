import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PageState from "./PageState";
import { Button } from "./ui/Button";
import { useSessionStore } from "../lib/auth";
import { classNames } from "../lib/utils";

type LeaderRow = {
  alias: string;
  points: number;
  userId: string;
};

type Filter = "weekly" | "all";
type AliasRelation = { alias: string | null } | null;

type LeaderboardRowWithAlias = {
  points: number | null;
  user_id: string;
  public_aliases?: AliasRelation | AliasRelation[];
};

type Standing = {
  rank: number;
  points: number;
  nextGap: number | null;
  withinTop: boolean;
};

const resolveAlias = (relation: LeaderboardRowWithAlias["public_aliases"]) => {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    return relation[0]?.alias ?? null;
  }
  return relation.alias ?? null;
};

export default function LeaderboardTable() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [filter, setFilter] = useState<Filter>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [standingLoading, setStandingLoading] = useState(false);
  const { session } = useSessionStore();

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const source = filter === "weekly" ? "leaderboard_weekly" : "leaderboard";
        const { data, error } = await supabase
          .from(source)
          .select("points, user_id, public_aliases(alias)")
          .order("points", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!active) return;

        const rowsWithAliases = (data ?? []) as LeaderboardRowWithAlias[];

        if (!active) return;

        const mapped = rowsWithAliases.map((row) => ({
          alias: resolveAlias(row.public_aliases) ?? "Anon",
          points: row.points ?? 0,
          userId: row.user_id
        }));

        setRows(mapped);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setRows([]);
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
    const source = filter === "weekly" ? "leaderboard_weekly" : "leaderboard";
    const topMatch = rows.find((row) => row.userId === userId) ?? null;

    setStandingLoading(true);

    const computeStanding = async () => {
      try {
        if (topMatch) {
          const index = rows.findIndex((row) => row.userId === userId);
          const previous = index > 0 ? rows[index - 1] : null;
          setStanding({
            rank: index + 1,
            points: topMatch.points,
            nextGap: previous ? Math.max(0, previous.points - topMatch.points) : null,
            withinTop: true
          });
          return;
        }

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
  }, [session, rows, filter, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={filter === "weekly" ? "primary" : "secondary"} onClick={() => setFilter("weekly")}>
          Weekly
        </Button>
        <Button variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>
          All-time
        </Button>
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
      {loading && rows.length === 0 ? (
        <PageState
          title="Loading leaderboard"
          description="Fetching the latest rankings."
          fullHeight
        />
      ) : null}
      <table className="min-w-full divide-y divide-neutral-200 overflow-hidden rounded-lg bg-white shadow-sm">
        <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Alias</th>
            <th className="px-4 py-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 text-sm">
          {rows.map((row, index) => {
            const isCurrentUser = session?.user.id === row.userId;
            return (
              <tr
                key={`${row.userId}-${index}`}
                className={classNames(isCurrentUser && "bg-brand-50" )}
                data-current-user={isCurrentUser ? "true" : undefined}
              >
                <td className="px-4 py-3 text-neutral-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <span className="flex items-center gap-2">
                    {row.alias}
                    {isCurrentUser ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">You</span>
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {session ? (
        standing ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">
              {filter === "weekly" ? "This week" : "All-time"} rank #{standing.rank}
            </p>
            <p className="mt-1">
              {standing.points} pts
              {standing.nextGap !== null
                ? ` · ${standing.nextGap} pts to move up`
                : " · You’re leading this board"}
              {standing.withinTop ? " — highlighted above." : " — you’re currently outside the top 100."}
            </p>
          </div>
        ) : standingLoading ? (
          <p className="text-xs text-neutral-500">Checking your standing…</p>
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
    </div>
  );
}

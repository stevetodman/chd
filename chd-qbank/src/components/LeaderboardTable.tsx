import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PageState from "./PageState";
import { Button } from "./ui/Button";

type LeaderRow = {
  alias: string;
  points: number;
};

type Filter = "weekly" | "all";
type AliasRelation = { alias: string | null } | null;

type LeaderboardRowWithAlias = {
  points: number | null;
  user_id: string;
  public_aliases?: AliasRelation | AliasRelation[];
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

        setRows(
          rowsWithAliases.map((row) => ({
            alias: resolveAlias(row.public_aliases) ?? "Anon",
            points: row.points ?? 0
          }))
        );
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
          {rows.map((row, index) => (
            <tr key={`${row.alias}-${index}`}>
              <td className="px-4 py-3 text-neutral-500">{index + 1}</td>
              <td className="px-4 py-3 font-medium">{row.alias}</td>
              <td className="px-4 py-3 text-right">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

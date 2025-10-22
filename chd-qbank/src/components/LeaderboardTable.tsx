import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "./ui/Button";

type LeaderRow = {
  alias: string;
  points: number;
};

type Filter = "weekly" | "all";
type LeaderboardRowWithId = {
  points: number | null;
  user_id: string;
};

export default function LeaderboardTable() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [filter, setFilter] = useState<Filter>("weekly");

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      const source = filter === "weekly" ? "leaderboard_weekly" : "leaderboard";
      const { data, error } = await supabase
        .from(source)
        .select("points, user_id")
        .order("points", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!active) return;

      const rowsWithIds = (data ?? []) as LeaderboardRowWithId[];
      const ids = Array.from(new Set(rowsWithIds.map((row) => row.user_id)));
      const aliasMap = new Map<string, string>();

      if (ids.length > 0) {
        const { data: aliases, error: aliasError } = await supabase
          .from("public_aliases")
          .select("user_id, alias")
          .in("user_id", ids);
        if (aliasError) throw aliasError;
        if (!active) return;
        (aliases ?? []).forEach((entry) => aliasMap.set(entry.user_id, entry.alias));
      }

      if (!active) return;

      setRows(
        rowsWithIds.map((row) => ({
          alias: aliasMap.get(row.user_id) ?? "Anon",
          points: row.points ?? 0
        }))
      );
    };

    fetchData().catch((err) => {
      if (active) {
        console.error(err);
        setRows([]);
      }
    });

    return () => {
      active = false;
    };
  }, [filter]);

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

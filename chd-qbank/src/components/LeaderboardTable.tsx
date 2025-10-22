import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "./ui/Button";

type LeaderRow = {
  alias: string;
  points: number;
};

type Filter = "weekly" | "all";
type LeaderboardAllTimeRow = {
  points: number | null;
  public_aliases: { alias: string | null } | null;
};

export default function LeaderboardTable() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [filter, setFilter] = useState<Filter>("weekly");

  useEffect(() => {
    const fetchData = async () => {
      if (filter === "weekly") {
        const { data, error } = await supabase
          .from("leaderboard_weekly")
          .select("points, user_id")
          .order("points", { ascending: false })
          .limit(100);
        if (error) throw error;
        const ids = data?.map((d) => d.user_id) ?? [];
        const aliasMap = new Map<string, string>();
        if (ids.length > 0) {
          const { data: aliases } = await supabase
            .from("public_aliases")
            .select("user_id, alias")
            .in("user_id", ids);
          (aliases ?? []).forEach((entry) => aliasMap.set(entry.user_id, entry.alias));
        }
        setRows(
          (data ?? []).map((row) => ({
            alias: aliasMap.get(row.user_id) ?? "Anon",
            points: row.points ?? 0
          }))
        );
      } else {
        const { data, error } = await supabase
          .from("leaderboard")
          .select("points, public_aliases(alias)")
          .order("points", { ascending: false })
          .limit(100);
        if (error) throw error;
        setRows(
          ((data ?? []) as LeaderboardAllTimeRow[]).map((row) => ({
            alias: row.public_aliases?.alias ?? "Anon",
            points: row.points ?? 0
          }))
        );
      }
    };
    fetchData().catch((err) => console.error(err));
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

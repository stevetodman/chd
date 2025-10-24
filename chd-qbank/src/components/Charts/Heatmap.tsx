import { useEffect, useMemo, useState } from "react";
import { fetchAdminHeatmap } from "../../lib/analytics";
import type { HeatmapAggregateRow } from "../../lib/constants";

type Cell = {
  lesion: string;
  topic: string;
  attempts: number;
  correct_rate: number;
};

const palette = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"];

function colorFor(rate: number) {
  const clampedRate = Math.max(0, Math.min(1, rate));
  const index = Math.min(palette.length - 1, Math.floor(clampedRate * palette.length));
  return palette[index];
}

export default function Heatmap() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [rawRows, setRawRows] = useState<HeatmapAggregateRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminHeatmap()
      .then((rows) => {
        if (cancelled) return;
        setRawRows(rows);
        const aggregates = new Map<string, { lesion: string; topic: string; attempts: number; correct: number }>();
        for (const row of rows) {
          const lesion = row.lesion ?? "Unspecified";
          const topic = row.topic ?? "Unspecified";
          const key = `${lesion}__${topic}`;
          const existing = aggregates.get(key) ?? { lesion, topic, attempts: 0, correct: 0 };
          existing.attempts += Number(row.attempts ?? 0);
          existing.correct += Number(row.correct_attempts ?? 0);
          aggregates.set(key, existing);
        }
        const nextCells = Array.from(aggregates.values())
          .map((entry) => ({
            lesion: entry.lesion,
            topic: entry.topic,
            attempts: entry.attempts,
            correct_rate: entry.attempts > 0 ? entry.correct / entry.attempts : 0
          }))
          .sort((a, b) => a.lesion.localeCompare(b.lesion) || a.topic.localeCompare(b.topic));
        setCells(nextCells);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load heatmap", err);
        const message = err instanceof Error ? err.message : "Failed to load heatmap data.";
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const lesions = useMemo(() => Array.from(new Set(cells.map((c) => c.lesion))).sort(), [cells]);
  const topics = useMemo(() => Array.from(new Set(cells.map((c) => c.topic))).sort(), [cells]);

  const cellMap = useMemo(() => {
    const map = new Map<string, Cell>();
    for (const cell of cells) {
      map.set(`${cell.lesion}__${cell.topic}`, cell);
    }
    return map;
  }, [cells]);

  const weeklySpan = useMemo(() => {
    if (rawRows.length === 0) return null;
    const weeks = new Set(rawRows.map((row) => row.week_start));
    return weeks.size;
  }, [rawRows]);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700">Performance heatmap</h3>
      {error ? (
        <p className="mb-3 text-xs text-red-600" role="alert">
          Failed to load heatmap data: {error}
        </p>
      ) : null}
      {weeklySpan ? (
        <p className="mb-3 text-xs text-neutral-500">
          Aggregated across {weeklySpan} weekly buckets with {rawRows.length} question-week rows.
        </p>
      ) : null}
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Lesion</th>
            {topics.map((topic) => (
              <th key={topic} className="px-2 py-1 text-left">
                {topic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lesions.map((lesion) => (
            <tr key={lesion}>
              <th className="px-2 py-1 text-left font-semibold">{lesion}</th>
              {topics.map((topic) => {
                const cell = cellMap.get(`${lesion}__${topic}`);
                const rate = cell?.correct_rate ?? 0;
                return (
                  <td
                    key={topic}
                    className="px-2 py-1 text-center"
                    style={{ backgroundColor: colorFor(rate), minWidth: "70px" }}
                    title={cell ? `${cell.attempts} attempts` : "No attempts"}
                  >
                    {cell ? `${Math.round(rate * 100)}%` : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

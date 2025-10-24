import { useEffect, useMemo, useState } from "react";
import { fetchAdminHeatmap } from "../../lib/analytics";
import { getErrorMessage } from "../../lib/utils";

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

type HeatmapData = {
  cells: Cell[];
  lesions: string[];
  topics: string[];
  weeklySpan: number | null;
  rowCount: number;
};

const EMPTY_DATA: HeatmapData = {
  cells: [],
  lesions: [],
  topics: [],
  weeklySpan: null,
  rowCount: 0
};

export default function Heatmap() {
  const [data, setData] = useState<HeatmapData>(EMPTY_DATA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminHeatmap()
      .then((rows) => {
        if (cancelled) return;
        const aggregates = new Map<string, { lesion: string; topic: string; attempts: number; correct: number }>();
        const lesionSet = new Set<string>();
        const topicSet = new Set<string>();
        const weekSet = new Set<string | null>();

        for (const row of rows) {
          const lesion = row.lesion ?? "Unspecified";
          const topic = row.topic ?? "Unspecified";
          const key = `${lesion}__${topic}`;
          const existing = aggregates.get(key) ?? { lesion, topic, attempts: 0, correct: 0 };
          existing.attempts += Number(row.attempts ?? 0);
          existing.correct += Number(row.correct_attempts ?? 0);
          aggregates.set(key, existing);
          lesionSet.add(lesion);
          topicSet.add(topic);
          weekSet.add(row.week_start ?? null);
        }

        const cells = Array.from(aggregates.values())
          .map((entry) => ({
            lesion: entry.lesion,
            topic: entry.topic,
            attempts: entry.attempts,
            correct_rate: entry.attempts > 0 ? entry.correct / entry.attempts : 0
          }))
          .sort((a, b) => a.lesion.localeCompare(b.lesion) || a.topic.localeCompare(b.topic));

        setData({
          cells,
          lesions: Array.from(lesionSet).sort(),
          topics: Array.from(topicSet).sort(),
          weeklySpan: weekSet.size > 0 ? weekSet.size : null,
          rowCount: rows.length
        });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load heatmap", err);
        setError(getErrorMessage(err, "Failed to load heatmap data."));
        setData(EMPTY_DATA);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cellMap = useMemo(() => {
    const map = new Map<string, Cell>();
    for (const cell of data.cells) {
      map.set(`${cell.lesion}__${cell.topic}`, cell);
    }
    return map;
  }, [data.cells]);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700">Performance heatmap</h3>
      {error ? (
        <p className="mb-3 text-xs text-red-600" role="alert">
          Failed to load heatmap data: {error}
        </p>
      ) : null}
      {data.weeklySpan ? (
        <p className="mb-3 text-xs text-neutral-500">
          Aggregated across {data.weeklySpan} weekly buckets with {data.rowCount} question-week rows.
        </p>
      ) : null}
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Lesion</th>
            {data.topics.map((topic) => (
              <th key={topic} className="px-2 py-1 text-left">
                {topic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lesions.map((lesion) => (
            <tr key={lesion}>
              <th className="px-2 py-1 text-left font-semibold">{lesion}</th>
              {data.topics.map((topic) => {
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

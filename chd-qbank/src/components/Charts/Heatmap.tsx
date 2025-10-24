import { useEffect, useMemo, useState } from "react";
import { fetchAdminHeatmap } from "../../lib/analytics";
import { getErrorMessage } from "../../lib/utils";

type Cell = {
  lesion: string;
  topic: string;
  attempts: number;
  correct_attempts: number;
  correct_rate: number;
};

const paletteClasses = [
  "bg-[#f7fbff]",
  "bg-[#deebf7]",
  "bg-[#c6dbef]",
  "bg-[#9ecae1]",
  "bg-[#6baed6]",
  "bg-[#4292c6] text-white",
  "bg-[#2171b5] text-white",
  "bg-[#084594] text-white"
] as const;

function classForRate(rate: number) {
  const clampedRate = Math.max(0, Math.min(1, rate));
  const index = Math.min(paletteClasses.length - 1, Math.floor(clampedRate * paletteClasses.length));
  return paletteClasses[index];
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
            correct_attempts: entry.correct,
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

  const recommendations = useMemo(() => {
    const topicTotals = new Map<
      string,
      { topic: string; attempts: number; correct: number }
    >();

    for (const cell of data.cells) {
      const entry = topicTotals.get(cell.topic) ?? {
        topic: cell.topic,
        attempts: 0,
        correct: 0
      };
      entry.attempts += cell.attempts;
      entry.correct += cell.correct_attempts;
      topicTotals.set(cell.topic, entry);
    }

    const MIN_TOPIC_ATTEMPTS = 20;
    const WEAKNESS_THRESHOLD = 0.7;
    const MAX_RECOMMENDATIONS = 3;

    return Array.from(topicTotals.values())
      .map((entry) => ({
        topic: entry.topic,
        attempts: entry.attempts,
        correct: entry.correct,
        correct_rate: entry.attempts > 0 ? entry.correct / entry.attempts : 0
      }))
      .filter((entry) => entry.attempts >= MIN_TOPIC_ATTEMPTS && entry.correct_rate <= WEAKNESS_THRESHOLD)
      .sort((a, b) => {
        if (a.correct_rate === b.correct_rate) {
          return b.attempts - a.attempts;
        }
        return a.correct_rate - b.correct_rate;
      })
      .slice(0, MAX_RECOMMENDATIONS)
      .map((entry) => {
        const severityAction = (() => {
          if (entry.correct_rate < 0.4) {
            return "Schedule a faculty-led remediation session with targeted practice questions.";
          }
          if (entry.correct_rate < 0.55) {
            return "Assign a focused quiz and follow up with a small-group case discussion.";
          }
          return "Share curated review resources and encourage spaced repetition drills.";
        })();

        return {
          ...entry,
          recommendation: severityAction
        };
      });
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
                    className={`min-w-[70px] px-2 py-1 text-center text-sm font-medium text-neutral-900 ${classForRate(rate)}`}
                    title={
                      cell
                        ? `${cell.attempts} attempts • ${cell.correct_attempts} correct`
                        : "No attempts"
                    }
                  >
                    {cell ? `${Math.round(rate * 100)}%` : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 border-t border-neutral-200 pt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Next steps
        </h4>
        {recommendations.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No topics meet the threshold for targeted recommendations yet. Encourage more
            practice to surface actionable trends.
          </p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((topic) => {
              const ratePercent = Math.round(topic.correct_rate * 100);
              return (
                <li
                  key={topic.topic}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-neutral-700"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-neutral-800">{topic.topic}</span>
                    <span className="text-[11px] uppercase tracking-wide text-amber-600">
                      {ratePercent}% correct across {topic.attempts} attempts
                    </span>
                  </div>
                  <p className="mt-1 leading-5 text-neutral-700">{topic.recommendation}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

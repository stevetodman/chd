import { useEffect, useState } from "react";
import { fetchHeatmap } from "../../lib/analytics";

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

  useEffect(() => {
    fetchHeatmap()
      .then(setCells)
      .catch((err) => console.error(err));
  }, []);

  const lesions = Array.from(new Set(cells.map((c) => c.lesion)));
  const topics = Array.from(new Set(cells.map((c) => c.topic)));

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700">Performance heatmap</h3>
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
                const cell = cells.find((c) => c.lesion === lesion && c.topic === topic);
                const rate = cell?.correct_rate ?? 0;
                return (
                  <td
                    key={topic}
                    className="px-2 py-1 text-center"
                    style={{ backgroundColor: colorFor(rate), minWidth: "70px" }}
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

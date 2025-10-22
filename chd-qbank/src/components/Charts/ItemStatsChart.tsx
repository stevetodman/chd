import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { fetchItemStats } from "../../lib/analytics";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ItemStatsChart() {
  const [labels, setLabels] = useState<string[]>([]);
  const [pValues, setPValues] = useState<number[]>([]);
  const [discrimination, setDiscrimination] = useState<number[]>([]);

  useEffect(() => {
    fetchItemStats()
      .then((stats) => {
        setLabels(stats.map((s) => s.question_id.slice(0, 8)));
        setPValues(stats.map((s) => s.p_value ?? 0));
        setDiscrimination(stats.map((s) => s.discrimination_pb ?? 0));
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700">Psychometrics (n ≥ 30)</h3>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "Difficulty (p-value)",
              backgroundColor: "rgba(37,99,235,0.5)",
              borderColor: "rgba(37,99,235,1)",
              data: pValues
            },
            {
              label: "Discrimination (pb)",
              backgroundColor: "rgba(15,118,110,0.5)",
              borderColor: "rgba(15,118,110,1)",
              data: discrimination
            }
          ]
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { position: "top" as const }
          },
          scales: {
            y: {
              min: -1,
              max: 1
            }
          }
        }}
      />
    </div>
  );
}

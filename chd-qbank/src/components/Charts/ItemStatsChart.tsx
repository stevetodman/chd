import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { fetchItemStats } from '../../lib/analytics';
import { getErrorMessage } from '../../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ItemStatsChart() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchItemStats>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItemStats()
      .then((items) => {
        setStats(items);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load item stats', err);
        setError(getErrorMessage(err, 'Failed to load item stats.'));
        setStats([]);
      });
  }, []);

  const chartData = useMemo(() => {
    return {
      labels: stats.map((s) => s.question_id.slice(0, 8)),
      pValues: stats.map((s) => s.p_value ?? 0),
      discrimination: stats.map((s) => s.discrimination_pb ?? 0),
    };
  }, [stats]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700">Psychometrics (n ≥ 30)</h3>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Failed to load item stats: {error}
        </p>
      ) : chartData.labels.length === 0 ? (
        <p className="text-sm text-neutral-500">No item stats available yet.</p>
      ) : (
        <Bar
          data={{
            labels: chartData.labels,
            datasets: [
              {
                label: 'Difficulty (p-value)',
                backgroundColor: 'rgba(37,99,235,0.5)',
                borderColor: 'rgba(37,99,235,1)',
                data: chartData.pValues,
              },
              {
                label: 'Discrimination (pb)',
                backgroundColor: 'rgba(15,118,110,0.5)',
                borderColor: 'rgba(15,118,110,1)',
                data: chartData.discrimination,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { position: 'top' as const },
            },
            scales: {
              y: {
                min: -1,
                max: 1,
              },
            },
          }}
        />
      )}
    </div>
  );
}

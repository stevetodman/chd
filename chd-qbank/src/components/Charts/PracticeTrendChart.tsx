import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export type PracticeTrendDatum = {
  label: string;
  attempts: number;
  accuracy: number | null;
};

type Props = {
  data: PracticeTrendDatum[];
  loading: boolean;
  error: string | null;
};

export default function PracticeTrendChart({ data, loading, error }: Props) {
  const chartData = useMemo(() => {
    const labels = data.map((point) => point.label);
    const attemptValues = data.map((point) => point.attempts);
    const accuracyValues = data.map((point) => (point.accuracy === null ? null : Number(point.accuracy.toFixed(1))));

    return { labels, attemptValues, accuracyValues };
  }, [data]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading your practice trends…</p>;
  }

  if (chartData.labels.length === 0) {
    return <p className="text-sm text-neutral-500">Practice a few questions to unlock your trend chart.</p>;
  }

  return (
    <div className="h-64">
      <Chart
        type="bar"
        data={{
          labels: chartData.labels,
          datasets: [
            {
              type: "bar" as const,
              label: "Attempts",
              data: chartData.attemptValues,
              backgroundColor: "rgba(37,99,235,0.25)",
              borderColor: "rgba(37,99,235,0.6)",
              borderWidth: 1,
              yAxisID: "y"
            },
            {
              type: "line" as const,
              label: "Accuracy %",
              data: chartData.accuracyValues,
              borderColor: "rgba(16,185,129,1)",
              backgroundColor: "rgba(16,185,129,0.15)",
              pointBackgroundColor: "rgba(16,185,129,1)",
              fill: true,
              tension: 0.35,
              spanGaps: true,
              yAxisID: "y1"
            }
          ]
        }}
        options={{
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: "top"
            },
            tooltip: {
              mode: "index",
              intersect: false
            }
          },
          interaction: {
            mode: "index" as const,
            intersect: false
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(148,163,184,0.2)"
              },
              ticks: {
                precision: 0
              }
            },
            y1: {
              beginAtZero: true,
              max: 100,
              position: "right",
              grid: {
                drawOnChartArea: false
              },
              ticks: {
                callback: (value) => `${value}%`
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }}
      />
    </div>
  );
}

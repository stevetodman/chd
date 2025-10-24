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
    const attemptDeltas = attemptValues.map((value, index) => {
      if (index === 0) return null;
      return value - attemptValues[index - 1];
    });
    const accuracyDeltas = accuracyValues.map((value, index) => {
      const previous = accuracyValues[index - 1];
      if (index === 0 || value === null || previous === null || typeof previous === "undefined") {
        return null;
      }
      const delta = value - previous;
      return Number(delta.toFixed(1));
    });

    const maxAttempt = attemptValues.length > 0 ? Math.max(...attemptValues) : 0;
    const maxAttemptIndex = maxAttempt > 0 ? attemptValues.findIndex((value) => value === maxAttempt) : -1;
    const backgroundColors = attemptValues.map((value, index) => {
      if (index === maxAttemptIndex) {
        return "rgba(37,99,235,0.65)";
      }
      if (index === attemptValues.length - 1 && value > 0) {
        return "rgba(59,130,246,0.45)";
      }
      return "rgba(37,99,235,0.2)";
    });
    const borderColors = attemptValues.map((value, index) => {
      if (index === maxAttemptIndex) {
        return "rgba(37,99,235,0.85)";
      }
      if (index === attemptValues.length - 1 && value > 0) {
        return "rgba(59,130,246,0.65)";
      }
      return value > 0 ? "rgba(37,99,235,0.35)" : "rgba(148,163,184,0.25)";
    });

    return {
      labels,
      attemptValues,
      accuracyValues,
      attemptDeltas,
      accuracyDeltas,
      backgroundColors,
      borderColors,
      maxAttemptIndex
    };
  }, [data]);

  const {
    labels,
    attemptValues,
    accuracyValues,
    attemptDeltas,
    accuracyDeltas,
    backgroundColors,
    borderColors,
    maxAttemptIndex
  } = chartData;
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const mostRecentIndex = Math.max(0, labels.length - 1);
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let index = attemptValues.length - 1; index >= 0; index -= 1) {
      if (attemptValues[index] > 0) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [attemptValues]);

  const streakMessage = useMemo(() => {
    if (attemptValues.length === 0 || currentStreak === 0) {
      return null;
    }
    if (currentStreak >= 3) {
      return `You're on a ${currentStreak}-week practice streak—keep it going!`;
    }
    if (currentStreak === 2) {
      return "Nice momentum—two weeks of consistent practice.";
    }
    return "Great job getting back into practice this week.";
  }, [attemptValues.length, currentStreak]);

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

  if (labels.length === 0) {
    return <p className="text-sm text-neutral-500">Practice a few questions to unlock your trend chart.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="h-64">
        <Chart
          type="bar"
          data={{
            labels,
            datasets: [
              {
                type: "bar" as const,
                label: "Attempts",
                data: attemptValues,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 6,
                yAxisID: "y"
              },
              {
                type: "line" as const,
                label: "Accuracy %",
                data: accuracyValues,
                borderColor: "rgba(16,185,129,1)",
                backgroundColor: "rgba(16,185,129,0.15)",
                pointBackgroundColor: "rgba(16,185,129,1)",
                pointBorderColor: "rgba(16,185,129,1)",
                pointRadius: 4,
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
                position: "top",
                labels: {
                  usePointStyle: true,
                  boxWidth: 8
                }
              },
              tooltip: {
                mode: "index",
                intersect: false,
                displayColors: false,
                callbacks: {
                  label: (context) => {
                    if (context.datasetIndex === 0) {
                      const value = typeof context.parsed.y === "number" && Number.isFinite(context.parsed.y)
                        ? context.parsed.y
                        : 0;
                      return `Attempts: ${numberFormatter.format(value)}`;
                    }
                    if (context.datasetIndex === 1) {
                      const value =
                        typeof context.parsed.y === "number" && Number.isFinite(context.parsed.y)
                          ? context.parsed.y
                          : null;
                      return value === null ? "Accuracy: –" : `Accuracy: ${value.toFixed(1)}%`;
                    }
                    return null;
                  },
                  afterLabel: (context) => {
                    const index = context.dataIndex;
                    if (context.datasetIndex === 0) {
                      const delta = attemptDeltas[index];
                      if (delta === null || delta === 0) return undefined;
                      const arrow = delta > 0 ? "▲" : "▼";
                      return `${arrow} ${numberFormatter.format(Math.abs(delta))} vs. prior week`;
                    }
                    if (context.datasetIndex === 1) {
                      const delta = accuracyDeltas[index];
                      if (delta === null || delta === 0) return undefined;
                      const arrow = delta > 0 ? "▲" : "▼";
                      return `${arrow} ${Math.abs(delta).toFixed(1)} pts vs. prior week`;
                    }
                    return undefined;
                  },
                  footer: (items) => {
                    if (!items.length) return "";
                    const index = items[0]?.dataIndex ?? 0;
                    const badges: string[] = [];
                    if (index === mostRecentIndex && attemptValues[index] > 0) {
                      badges.push("Latest week");
                    }
                    if (index === maxAttemptIndex && maxAttemptIndex >= 0) {
                      badges.push("Best week so far");
                    }
                    return badges.join(" • ");
                  }
                }
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
      {streakMessage ? <p className="text-xs text-neutral-600">{streakMessage}</p> : null}
    </div>
  );
}

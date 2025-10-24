import { useMemo, useState } from "react";
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
  const [showTable, setShowTable] = useState(false);
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

  const accessibleSummary = useMemo(() => {
    if (!labels.length) {
      return "No practice activity recorded yet.";
    }
    const latestAttempts = attemptValues[mostRecentIndex] ?? 0;
    const previousAttempts = mostRecentIndex > 0 ? attemptValues[mostRecentIndex - 1] ?? 0 : null;
    const latestAccuracy = accuracyValues[mostRecentIndex];
    const previousAccuracy = mostRecentIndex > 0 ? accuracyValues[mostRecentIndex - 1] ?? null : null;

    const attemptPart = (() => {
      if (previousAttempts === null) {
        return `This week logged ${numberFormatter.format(latestAttempts)} attempts.`;
      }
      const delta = latestAttempts - previousAttempts;
      if (delta === 0) {
        return `This week matched last week's ${numberFormatter.format(latestAttempts)} attempts.`;
      }
      const direction = delta > 0 ? "up" : "down";
      return `This week logged ${numberFormatter.format(latestAttempts)} attempts, ${direction} ${numberFormatter.format(Math.abs(delta))} from last week.`;
    })();

    const accuracyPart = (() => {
      if (latestAccuracy === null) {
        return "Accuracy is not yet available for this period.";
      }
      if (previousAccuracy === null) {
        return `Accuracy landed at ${latestAccuracy.toFixed(1)}%.`;
      }
      const delta = latestAccuracy - previousAccuracy;
      if (delta === 0) {
        return `Accuracy held steady at ${latestAccuracy.toFixed(1)}%.`;
      }
      const direction = delta > 0 ? "improved" : "slipped";
      return `Accuracy ${direction} to ${latestAccuracy.toFixed(1)}%, ${Math.abs(delta).toFixed(1)} points ${delta > 0 ? "higher" : "lower"} than last week.`;
    })();

    return `${attemptPart} ${accuracyPart}`;
  }, [accuracyValues, attemptValues, labels.length, mostRecentIndex, numberFormatter]);

  const toggleTable = () => {
    setShowTable((value) => !value);
  };

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600" id="practice-trend-summary">
          {accessibleSummary}
        </p>
        <button
          type="button"
          onClick={toggleTable}
          className="self-start rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-brand-300 hover:text-brand-600"
          aria-pressed={showTable}
          aria-controls="practice-trend-table"
        >
          {showTable ? "Hide data table" : "Show data table"}
        </button>
      </div>
      <div className="h-64" aria-describedby="practice-trend-summary">
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
      <div
        id="practice-trend-table"
        className={`${showTable ? "block" : "hidden"} overflow-x-auto rounded-lg border border-neutral-200 bg-white text-sm`}
      >
        <table className="min-w-full divide-y divide-neutral-200 text-left">
          <caption className="px-4 py-2 text-left text-xs text-neutral-500">
            Tabular summary of weekly attempts and accuracy for screen readers and printable reports.
          </caption>
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-2">
                Week
              </th>
              <th scope="col" className="px-4 py-2">
                Attempts
              </th>
              <th scope="col" className="px-4 py-2">
                Accuracy (%)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 text-sm text-neutral-700">
            {labels.map((label, index) => {
              const accuracyValue = accuracyValues[index];
              return (
                <tr key={label}>
                  <th scope="row" className="px-4 py-2 font-medium text-neutral-900">
                    {label}
                  </th>
                  <td className="px-4 py-2">{numberFormatter.format(attemptValues[index] ?? 0)}</td>
                  <td className="px-4 py-2">
                    {typeof accuracyValue === "number" ? accuracyValue.toFixed(1) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

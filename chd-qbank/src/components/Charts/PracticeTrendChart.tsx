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
import { useI18n } from "../../i18n";

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
  const { locale, formatMessage } = useI18n();
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
    [locale]
  );
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
      return formatMessage(
        {
          id: "chart.practiceTrend.streak.strong",
          defaultMessage: "You're on a {count, number}‑week practice streak—keep it going!"
        },
        { count: currentStreak }
      );
    }
    if (currentStreak === 2) {
      return formatMessage({
        id: "chart.practiceTrend.streak.medium",
        defaultMessage: "Nice momentum—two weeks of consistent practice."
      });
    }
    return formatMessage({
      id: "chart.practiceTrend.streak.light",
      defaultMessage: "Great job getting back into practice this week."
    });
  }, [attemptValues.length, currentStreak, formatMessage]);

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
                label: formatMessage({ id: "chart.practiceTrend.dataset.attempts", defaultMessage: "Attempts" }),
                data: attemptValues,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 6,
                yAxisID: "y"
              },
              {
                type: "line" as const,
                label: formatMessage({ id: "chart.practiceTrend.dataset.accuracy", defaultMessage: "Accuracy (%)" }),
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
                      return formatMessage(
                        {
                          id: "chart.practiceTrend.tooltip.attempts",
                          defaultMessage: "Attempts: {value, number, integer}"
                        },
                        { value }
                      );
                    }
                    if (context.datasetIndex === 1) {
                      const value =
                        typeof context.parsed.y === "number" && Number.isFinite(context.parsed.y)
                          ? context.parsed.y
                          : null;
                      return value === null
                        ? formatMessage({
                            id: "chart.practiceTrend.tooltip.accuracyEmpty",
                            defaultMessage: "Accuracy: –"
                          })
                        : formatMessage(
                            {
                              id: "chart.practiceTrend.tooltip.accuracy",
                              defaultMessage: "Accuracy: {value}"
                            },
                            { value: percentFormatter.format(value / 100) }
                          );
                    }
                    return null;
                  },
                  afterLabel: (context) => {
                    const index = context.dataIndex;
                    if (context.datasetIndex === 0) {
                      const delta = attemptDeltas[index];
                      if (delta === null || delta === 0) return undefined;
                      const arrow = delta > 0 ? "▲" : "▼";
                      return formatMessage(
                        {
                          id: "chart.practiceTrend.tooltip.attemptDelta",
                          defaultMessage: "{arrow} {difference, number, integer} vs. prior week"
                        },
                        { arrow, difference: Math.abs(delta) }
                      );
                    }
                    if (context.datasetIndex === 1) {
                      const delta = accuracyDeltas[index];
                      if (delta === null || delta === 0) return undefined;
                      const arrow = delta > 0 ? "▲" : "▼";
                      return formatMessage(
                        {
                          id: "chart.practiceTrend.tooltip.accuracyDelta",
                          defaultMessage: "{arrow} {difference, number, decimal-1} pts vs. prior week"
                        },
                        { arrow, difference: Math.abs(delta) }
                      );
                    }
                    return undefined;
                  },
                  footer: (items) => {
                    if (!items.length) return "";
                    const index = items[0]?.dataIndex ?? 0;
                    const badges: string[] = [];
                    if (index === mostRecentIndex && attemptValues[index] > 0) {
                      badges.push(
                        formatMessage({ id: "chart.practiceTrend.tooltip.badge.latest", defaultMessage: "Latest week" })
                      );
                    }
                    if (index === maxAttemptIndex && maxAttemptIndex >= 0) {
                      badges.push(
                        formatMessage({ id: "chart.practiceTrend.tooltip.badge.best", defaultMessage: "Best week so far" })
                      );
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
                  callback: (value) =>
                    typeof value === "number"
                      ? percentFormatter.format(value / 100)
                      : formatMessage({ id: "chart.practiceTrend.axis.percent", defaultMessage: "0%" })
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

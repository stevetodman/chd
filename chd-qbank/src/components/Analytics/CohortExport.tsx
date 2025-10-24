import { useState } from "react";
import { fetchAdminCohortSummary } from "../../lib/analytics";
import type { CohortSummaryRow } from "../../lib/constants";
import { getErrorMessage } from "../../lib/utils";

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString();
  } catch {
    return value;
  }
}

type ExportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; fileName: string; rowCount: number };

export default function CohortExport() {
  const [state, setState] = useState<ExportState>({ status: "idle" });

  async function handleExport() {
    setState({ status: "loading" });
    try {
      const rows = await fetchAdminCohortSummary();
      const headers: Array<keyof CohortSummaryRow> = [
        "cohort_id",
        "total_attempts",
        "correct_attempts",
        "incorrect_attempts",
        "correct_rate",
        "avg_time_ms",
        "first_attempt_at",
        "last_attempt_at"
      ];

      const csvLines = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((header) => {
              if (header === "first_attempt_at" || header === "last_attempt_at") {
                return toCsvValue(formatTimestamp(row[header]));
              }
              if (header === "correct_rate") {
                const rate = row.correct_rate ?? 0;
                return toCsvValue(rate.toFixed(4));
              }
              if (header === "avg_time_ms") {
                return toCsvValue(
                  typeof row.avg_time_ms === "number" ? row.avg_time_ms.toFixed(2) : row.avg_time_ms
                );
              }
              return toCsvValue(row[header]);
            })
            .join(",")
        )
      ];

      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const fileName = `cohort-export-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setState({ status: "ready", fileName, rowCount: rows.length });
    } catch (error) {
      console.error("Failed to export cohort CSV", error);
      setState({ status: "error", message: getErrorMessage(error, "Unable to export cohort data.") });
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-700">Cohort export</h3>
      <p className="mt-2 text-xs text-neutral-500">
        Download anonymized per-learner aggregates (hashed identifier, attempt counts, accuracy, and activity timestamps).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={state.status === "loading"}
          className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {state.status === "loading" ? "Preparing download…" : "Export cohort CSV"}
        </button>
        {state.status === "error" ? (
          <span className="text-xs text-red-600" role="alert">
            {state.message}
          </span>
        ) : null}
        {state.status === "ready" ? (
          <span className="text-xs text-emerald-600">
            Downloaded {state.rowCount} rows to <span className="font-mono">{state.fileName}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

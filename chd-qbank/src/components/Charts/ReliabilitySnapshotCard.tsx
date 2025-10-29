import { useEffect, useMemo, useState } from "react";
import type { ReliabilitySnapshot } from "../../lib/constants";
import { fetchReliabilitySnapshot, refreshReliabilityMetrics } from "../../lib/analytics";
import { Button } from "../ui/Button";
import { getErrorMessage } from "../../lib/utils";

interface StatusMessage {
  tone: "success" | "error";
  text: string;
}

function formatAlpha(value: number | null, formatter: Intl.NumberFormat): string {
  if (value === null || Number.isNaN(value)) {
    return "–";
  }
  return formatter.format(value);
}

function formatOptional(value: number | null, formatter: Intl.NumberFormat): string {
  if (value === null || Number.isNaN(value)) {
    return "–";
  }
  return formatter.format(value);
}

export default function ReliabilitySnapshotCard() {
  const [snapshot, setSnapshot] = useState<ReliabilitySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const alphaFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    []
  );
  const countFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const varianceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    []
  );

  const computedAt = useMemo(() => {
    if (!snapshot?.last_computed_at) return null;
    const computed = new Date(snapshot.last_computed_at);
    if (Number.isNaN(computed.getTime())) return null;
    return computed.toLocaleString();
  }, [snapshot?.last_computed_at]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    fetchReliabilitySnapshot()
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load reliability snapshot", err);
        setSnapshot(null);
        setError(getErrorMessage(err, "Unable to load reliability metrics."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatusMessage(null);
    setError(null);
    setLoading(true);

    try {
      await refreshReliabilityMetrics();
      const latest = await fetchReliabilitySnapshot();
      setSnapshot(latest);
      if (latest) {
        setStatusMessage({ tone: "success", text: "Reliability metrics refreshed." });
      } else {
        setStatusMessage({
          tone: "success",
          text: "Refresh requested. Metrics will appear once the snapshot is ready."
        });
      }
    } catch (err) {
      console.error("Failed to refresh reliability metrics", err);
      const message = getErrorMessage(err, "Unable to refresh reliability metrics. Try again later.");
      if (!snapshot) {
        setError(message);
      }
      setStatusMessage({ tone: "error", text: message });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const showSnapshot = !loading && !error && !!snapshot;
  const showEmptyState = !loading && !error && !snapshot;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Reliability snapshot</h3>
        <Button
          type="button"
          variant="secondary"
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh metrics"}
        </Button>
      </div>

      <div className="mt-3 space-y-3 text-sm text-neutral-700">
        {statusMessage ? (
          <p
            className={statusMessage.tone === "error" ? "text-sm text-red-600" : "text-sm text-emerald-700"}
            role={statusMessage.tone === "error" ? "alert" : "status"}
          >
            {statusMessage.text}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            Failed to load reliability snapshot: {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-neutral-500">Loading reliability snapshot…</p>
        ) : null}

        {showSnapshot ? (
          <div className="space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">KR-20 α</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {formatAlpha(snapshot?.kr20_alpha ?? null, alphaFormatter)}
                </dd>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Cronbach&apos;s α</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {formatAlpha(snapshot?.cronbach_alpha ?? null, alphaFormatter)}
                </dd>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Items</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {snapshot ? countFormatter.format(snapshot.n_items) : "–"}
                </dd>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Learners</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {snapshot ? countFormatter.format(snapshot.n_users) : "–"}
                </dd>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Total attempts</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {snapshot ? countFormatter.format(snapshot.total_attempts) : "–"}
                </dd>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Score variance</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {formatOptional(snapshot?.score_variance ?? null, varianceFormatter)}
                </dd>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sum item variance</dt>
                <dd className="text-lg font-semibold text-neutral-900">
                  {formatOptional(snapshot?.sum_item_variance ?? null, varianceFormatter)}
                </dd>
              </div>
            </dl>
            {computedAt ? (
              <p className="text-xs text-neutral-500" data-testid="reliability-computed-at">
                Computed {computedAt}.
              </p>
            ) : null}
          </div>
        ) : null}

        {showEmptyState ? (
          <p className="text-sm text-neutral-500">
            No reliability snapshot available yet. Run the refresh to compute baseline metrics.
          </p>
        ) : null}
      </div>
    </div>
  );
}

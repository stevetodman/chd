import { Suspense, lazy } from "react";

const ItemStatsChart = lazy(() => import("../../components/Charts/ItemStatsChart"));
const Heatmap = lazy(() => import("../../components/Charts/Heatmap"));

export default function Analytics() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <Suspense fallback={<div className="text-sm text-neutral-500">Loading analytics…</div>}>
        <ItemStatsChart />
      </Suspense>
      <Suspense fallback={<div className="text-sm text-neutral-500">Preparing heatmap…</div>}>
        <Heatmap />
      </Suspense>
    </div>
  );
}

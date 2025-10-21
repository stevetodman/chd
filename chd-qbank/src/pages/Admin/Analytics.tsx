import ItemStatsChart from "../../components/Charts/ItemStatsChart";
import Heatmap from "../../components/Charts/Heatmap";

export default function Analytics() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <ItemStatsChart />
      <Heatmap />
    </div>
  );
}

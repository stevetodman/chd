import LeaderboardTable from "../components/LeaderboardTable";

export default function Leaderboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      <p className="text-sm text-neutral-600">Aliases only. Weekly and all-time filters included.</p>
      <LeaderboardTable />
    </div>
  );
}

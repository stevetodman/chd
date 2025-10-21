import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";

export default function Settings() {
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Supabase integration: read setting stored in app_settings table.
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "leaderboard_enabled")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setLeaderboardEnabled(data.value === "true");
      });
  }, []);

  const save = async () => {
    setMessage(null);
    await supabase.from("app_settings").upsert({ key: "leaderboard_enabled", value: leaderboardEnabled ? "true" : "false" });
    setMessage("Settings saved");
  };

  const resetLeaderboard = async () => {
    await supabase.from("leaderboard").delete().neq("user_id", "");
    setMessage("Leaderboard reset");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Settings</h1>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={leaderboardEnabled}
          onChange={(e) => setLeaderboardEnabled(e.target.checked)}
        />
        Enable leaderboard
      </label>
      <Button type="button" onClick={save}>
        Save
      </Button>
      <Button type="button" variant="secondary" onClick={resetLeaderboard}>
        Reset all-time leaderboard
      </Button>
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import { useSettingsStore } from "../../lib/settings";

export default function Settings() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const globalLeaderboard = useSettingsStore((s) => s.leaderboardEnabled);
  const globalMaintenance = useSettingsStore((s) => s.maintenanceMode);
  const setGlobalLeaderboard = useSettingsStore((s) => s.setLeaderboardEnabled);
  const setGlobalMaintenance = useSettingsStore((s) => s.setMaintenanceMode);

  const [leaderboardEnabled, setLeaderboardEnabled] = useState(globalLeaderboard);
  const [maintenanceMode, setMaintenanceMode] = useState(globalMaintenance);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const hasChanges =
    leaderboardEnabled !== globalLeaderboard || maintenanceMode !== globalMaintenance;

  useEffect(() => { void loadSettings(); }, [loadSettings]);
  useEffect(() => { setLeaderboardEnabled(globalLeaderboard); }, [globalLeaderboard]);
  useEffect(() => { setMaintenanceMode(globalMaintenance); }, [globalMaintenance]);

  const saveSettings = async () => {
    if (!hasChanges) {
      setMessage({ text: "No changes to save.", tone: "success" });
      return;
    }

    setMessage(null);
    setSaving(true);
    try {
      const rows = [
        { key: "leaderboard_enabled", value: leaderboardEnabled ? "true" : "false" },
        { key: "maintenance_mode", value: maintenanceMode ? "true" : "false" }
      ];
      const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      setGlobalLeaderboard(leaderboardEnabled);
      setGlobalMaintenance(maintenanceMode);
      setMessage({ text: "Settings saved.", tone: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessage({ text: `Failed to save: ${msg}`, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const resetLeaderboard = async () => {
    if (typeof window !== "undefined" && !window.confirm("This will clear all-time leaderboard scores. Continue?")) {
      return;
    }
    setMessage(null);
    try {
      const { error } = await supabase.from("leaderboard").delete().neq("user_id", "");
      if (error) throw error;
      setMessage({ text: "Leaderboard reset.", tone: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessage({ text: `Failed to reset leaderboard: ${msg}`, tone: "error" });
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Admin Settings</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={leaderboardEnabled}
            onChange={(e) => setLeaderboardEnabled(e.target.checked)}
          />
          <span>Enable leaderboard for all users</span>
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
          />
          <span>Enable maintenance mode (lock out non-admins)</span>
        </label>

        <div className="flex items-center gap-3">
          <Button onClick={saveSettings} disabled={saving || !hasChanges}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button onClick={resetLeaderboard} variant="secondary">Reset all-time leaderboard</Button>
        </div>

        {message ? (
          <p className={message.tone === "error" ? "text-sm text-red-600" : "text-sm text-neutral-700"}>{message.text}</p>
        ) : null}
      </div>
    </div>
  );
}

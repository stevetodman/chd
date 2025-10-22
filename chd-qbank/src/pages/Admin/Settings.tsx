import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import { useSettingsStore } from "../../lib/settings";

export default function Settings() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const globalLeaderboardEnabled = useSettingsStore((state) => state.leaderboardEnabled);
  const setGlobalLeaderboardEnabled = useSettingsStore((state) => state.setLeaderboardEnabled);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(globalLeaderboardEnabled);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setLeaderboardEnabled(globalLeaderboardEnabled);
  }, [globalLeaderboardEnabled]);

  const save = async () => {
    setMessage(null);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "leaderboard_enabled", value: leaderboardEnabled ? "true" : "false" });

      if (error) {
        setMessage({ text: `Failed to save settings: ${error.message}`, tone: "error" });
        return;
      }

      setGlobalLeaderboardEnabled(leaderboardEnabled);
      setMessage({ text: "Settings saved", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessage({ text: `Failed to save settings: ${message}`, tone: "error" });
    }
  };

  const resetLeaderboard = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "This will clear all all-time leaderboard scores. Are you sure you want to continue?"
      );
      if (!confirmed) {
        return;
      }
    }

    setMessage(null);
    try {
      const { error } = await supabase.from("leaderboard").delete().neq("user_id", "");

      if (error) {
        setMessage({ text: `Failed to reset leaderboard: ${error.message}`, tone: "error" });
        return;
      }

      setMessage({ text: "Leaderboard reset", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessage({ text: `Failed to reset leaderboard: ${message}`, tone: "error" });
    }
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
      {message ? (
        <p
          className={
            message.tone === "error"
              ? "text-sm text-red-600"
              : "text-sm text-neutral-600"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

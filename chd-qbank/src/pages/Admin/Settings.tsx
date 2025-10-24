import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import { useSettingsStore } from "../../lib/settings";
import { getErrorMessage } from "../../lib/utils";
import { useI18n } from "../../i18n";
import { LOCALE_OPTIONS } from "../../locales";
import { Select } from "../../components/ui/Select";

export default function Settings() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const globalLeaderboard = useSettingsStore((s) => s.leaderboardEnabled);
  const globalMaintenance = useSettingsStore((s) => s.maintenanceMode);
  const setGlobalLeaderboard = useSettingsStore((s) => s.setLeaderboardEnabled);
  const setGlobalMaintenance = useSettingsStore((s) => s.setMaintenanceMode);
  const { locale, setLocale, t } = useI18n();

  const [leaderboardEnabled, setLeaderboardEnabled] = useState(globalLeaderboard);
  const [maintenanceMode, setMaintenanceMode] = useState(globalMaintenance);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const languageLabel = useMemo(
    () => LOCALE_OPTIONS.find((option) => option.code === locale)?.label ?? locale,
    [locale]
  );
  const hasChanges =
    leaderboardEnabled !== globalLeaderboard || maintenanceMode !== globalMaintenance;

  useEffect(() => { void loadSettings(); }, [loadSettings]);
  useEffect(() => { setLeaderboardEnabled(globalLeaderboard); }, [globalLeaderboard]);
  useEffect(() => { setMaintenanceMode(globalMaintenance); }, [globalMaintenance]);

  const saveSettings = async () => {
    if (!hasChanges) {
      setMessage({ text: t("admin.settings.noChanges", { defaultValue: "No changes to save." }), tone: "success" });
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
      setMessage({
        text: t("admin.settings.saveSuccess", { defaultValue: "Settings saved." }),
        tone: "success"
      });
    } catch (err) {
      setMessage({
        text: t("admin.settings.saveError", {
          defaultValue: "Failed to save: {message}",
          message: getErrorMessage(err, "Unknown error")
        }),
        tone: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetLeaderboard = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        t("admin.settings.resetConfirm", {
          defaultValue: "This will clear all-time leaderboard scores. Continue?"
        })
      )
    ) {
      return;
    }
    setMessage(null);
    try {
      const { error } = await supabase.from("leaderboard").delete().neq("user_id", "");
      if (error) throw error;
      setMessage({
        text: t("admin.settings.resetSuccess", { defaultValue: "Leaderboard reset." }),
        tone: "success"
      });
    } catch (err) {
      setMessage({
        text: t("admin.settings.resetError", {
          defaultValue: "Failed to reset leaderboard: {message}",
          message: getErrorMessage(err, "Unknown error")
        }),
        tone: "error"
      });
    }
  };

  const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">
        {t("admin.settings.heading", { defaultValue: "Admin Settings" })}
      </h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={leaderboardEnabled}
            onChange={(e) => setLeaderboardEnabled(e.target.checked)}
          />
          <span>
            {t("admin.settings.enableLeaderboard", {
              defaultValue: "Enable leaderboard for all users"
            })}
          </span>
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
          />
          <span>
            {t("admin.settings.enableMaintenance", {
              defaultValue: "Enable maintenance mode (lock out non-admins)"
            })}
          </span>
        </label>

        <div className="space-y-1 text-sm">
          <label htmlFor="language-select" className="font-medium text-neutral-700">
            {t("admin.settings.languageLabel", { defaultValue: "Language" })}
          </label>
          <Select
            id="language-select"
            value={locale}
            onChange={handleLocaleChange}
            aria-label={t("admin.settings.languageAriaLabel", { defaultValue: "Select interface language" })}
          >
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-neutral-500">
            {t("admin.settings.languageDescription", {
              defaultValue: "Current language: {language}",
              language: languageLabel
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={saveSettings} disabled={saving || !hasChanges}>
            {saving
              ? t("admin.settings.saving", { defaultValue: "Saving…" })
              : t("admin.settings.save", { defaultValue: "Save settings" })}
          </Button>
          <Button onClick={resetLeaderboard} variant="secondary">
            {t("admin.settings.resetLeaderboard", { defaultValue: "Reset all-time leaderboard" })}
          </Button>
        </div>

        {message ? (
          <p className={message.tone === "error" ? "text-sm text-red-600" : "text-sm text-neutral-700"}>{message.text}</p>
        ) : null}
      </div>
    </div>
  );
}

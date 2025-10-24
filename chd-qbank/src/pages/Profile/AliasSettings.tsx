import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import PageState from "../../components/PageState";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { useFeatureFlagsStore } from "../../store/featureFlags";
import { classNames } from "../../lib/utils";

export default function AliasSettings() {
  const { session } = useSessionStore();
  const [alias, setAlias] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const darkModeEnabled = useFeatureFlagsStore((state) => state.darkModeEnabled);
  const toggleDarkMode = useFeatureFlagsStore((state) => state.toggleDarkMode);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    supabase
      .from("app_users")
      .select("alias, alias_locked")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setAlias("");
          setLocked(false);
        } else if (data) {
          setAlias(data.alias ?? "");
          setLocked(Boolean(data.alias_locked));
        }
      })
      .finally(() => setLoading(false));
  }, [session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    if (locked) {
      setMessage("Your alias is locked and cannot be changed.");
      return;
    }

    const trimmed = alias.trim();
    if (!trimmed) {
      setError("Alias cannot be empty.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const { data, error: updateError } = await supabase
      .from("app_users")
      .update({ alias: trimmed })
      .eq("id", session.user.id)
      .select("alias, alias_locked")
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      setAlias(data.alias ?? trimmed);
      setLocked(Boolean(data.alias_locked));
      setMessage("Alias saved! This name is now locked for leaderboard play.");
    }

    setSaving(false);
  };

  const sendPasswordReset = async () => {
    if (!session?.user?.email) {
      setResetError("We couldn't find your account email. Try signing out and back in.");
      return;
    }

    setResetSending(true);
    setResetMessage(null);
    setResetError(null);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(session.user.email);

    if (resetErr) {
      setResetError(resetErr.message);
    } else {
      setResetMessage(`Password reset email sent to ${session.user.email}. Check your inbox to continue.`);
    }

    setResetSending(false);
  };

  if (loading) {
    return (
      <PageState
        title="Loading your profile"
        description="Fetching your leaderboard alias settings."
        fullHeight
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-neutral-700 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-neutral-800 dark:text-neutral-100">Dark mode</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Reduce glare and give your eyes a rest with the dark theme.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={darkModeEnabled}
            onClick={toggleDarkMode}
            className={classNames(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
              darkModeEnabled
                ? "bg-brand-500"
                : "bg-neutral-300 dark:bg-neutral-700"
            )}
          >
            <span className="sr-only">Toggle dark mode</span>
            <span
              aria-hidden="true"
              className={classNames(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                darkModeEnabled ? "translate-x-6" : "translate-x-1",
                darkModeEnabled ? "bg-white" : "bg-white dark:bg-neutral-100"
              )}
            />
          </button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard alias</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
            <p>
              Choose a display alias for the leaderboard. Aliases are visible to other learners and lock permanently after your
              first save.
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Alias</span>
              <input
                type="text"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                disabled={locked || saving}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                maxLength={40}
                placeholder="e.g. CyanoticAce"
              />
            </label>
            <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
              <li>Pick something you are comfortable sharing with classmates.</li>
              <li>No PHI, profanity, or identifying details.</li>
              <li>Aliases lock after the first save to protect leaderboard integrity.</li>
            </ul>
            {locked ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Your alias is locked. Contact an admin for changes.</p>
            ) : null}
            {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
            {message ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={locked || saving}>
              {locked ? "Alias locked" : saving ? "Saving…" : "Save alias"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
          <p>Need a new password? Send yourself a secure reset link at any time.</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            We&apos;ll email instructions to {session?.user.email ?? "the address on file"}. Links expire after a short time for
            your security.
          </p>
          {resetError ? <p className="text-xs text-red-600 dark:text-red-400">{resetError}</p> : null}
          {resetMessage ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{resetMessage}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="button" variant="secondary" onClick={sendPasswordReset} disabled={resetSending}>
            {resetSending ? "Sending…" : "Email me a reset link"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

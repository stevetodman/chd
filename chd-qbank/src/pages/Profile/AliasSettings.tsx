import { FormEvent, useEffect, useState } from "react";
import classNames from "classnames";
import { AuthApiError } from "@supabase/supabase-js";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import PageState from "../../components/PageState";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { getErrorMessage, normalizeErrorMessage } from "../../lib/utils";
import { useFeatureFlagsStore } from "../../store/featureFlags";

type PreferenceToggleProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
};

function PreferenceToggle({ id, label, description, checked, onToggle }: PreferenceToggleProps) {
  return (
    <label htmlFor={id} className="flex items-start justify-between gap-4">
      <span className="flex-1">
        <span className="text-sm font-medium text-neutral-900">{label}</span>
        <span className="mt-1 block text-xs text-neutral-500">{description}</span>
      </span>
      <span className="flex items-center pt-1">
        <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
        <span
          aria-hidden
          className={classNames(
            "inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500",
            checked ? "bg-brand-600" : "bg-neutral-300"
          )}
        >
          <span
            className={classNames(
              "ml-[3px] inline-block h-5 w-5 rounded-full bg-white shadow transition-all",
              checked ? "translate-x-[18px]" : "translate-x-0"
            )}
          />
        </span>
      </span>
    </label>
  );
}

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
  const tutorModeEnabled = useFeatureFlagsStore((state) => state.tutorModeEnabled);
  const toggleTutorMode = useFeatureFlagsStore((state) => state.toggleTutorMode);
  const darkModeEnabled = useFeatureFlagsStore((state) => state.darkModeEnabled);
  const toggleDarkMode = useFeatureFlagsStore((state) => state.toggleDarkMode);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const schedule = (callback: () => void) => {
      Promise.resolve().then(() => {
        if (!active) return;
        callback();
      });
    };

    schedule(() => {
      setLoading(true);
      setError(null);
    });

    supabase
      .from("app_users")
      .select("alias, alias_locked")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        schedule(() => {
          if (error) {
            setError(error.message);
            setAlias("");
            setLocked(false);
          } else if (data) {
            setAlias(data.alias ?? "");
            setLocked(Boolean(data.alias_locked));
          }
        });
      })
      .finally(() => {
        schedule(() => {
          setLoading(false);
        });
      });

    return () => {
      active = false;
    };
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

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password?email=${encodeURIComponent(session.user.email)}`
        : undefined;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      session.user.email,
      redirectTo ? { redirectTo } : undefined
    );

    if (resetErr) {
      const fallback = "Unable to send password reset email. Try again later.";
      const normalized = normalizeErrorMessage(resetErr);

      if (
        resetErr instanceof AuthApiError &&
        (resetErr.status === 429 || normalized?.includes("rate limit") || normalized?.includes("too many requests"))
      ) {
        setResetError("You're requesting password emails too quickly. Wait a moment and try again.");
      } else if (resetErr instanceof AuthApiError && resetErr.status >= 500) {
        setResetError("Password reset is temporarily unavailable. Try again in a few minutes.");
      } else if (normalized?.includes("failed to fetch") || normalized?.includes("network")) {
        setResetError("Password reset is temporarily unavailable. Try again in a few minutes.");
      } else {
        setResetError(getErrorMessage(resetErr, fallback));
      }
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
          <CardTitle>Leaderboard alias</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>
              Choose a display alias for the leaderboard. Aliases are visible to other learners and lock permanently after your
              first save.
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Alias</span>
              <input
                type="text"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                disabled={locked || saving}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                maxLength={40}
                placeholder="e.g. CyanoticAce"
              />
            </label>
            <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500">
              <li>Pick something you are comfortable sharing with classmates.</li>
              <li>No PHI, profanity, or identifying details.</li>
              <li>Aliases lock after the first save to protect leaderboard integrity.</li>
            </ul>
            {locked ? <p className="text-xs text-neutral-500">Your alias is locked. Contact an admin for changes.</p> : null}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
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
        <CardContent className="space-y-3 text-sm text-neutral-700">
          <p>Need a new password? Send yourself a secure reset link at any time.</p>
          <p className="text-xs text-neutral-500">
            We&apos;ll email instructions to {session?.user.email ?? "the address on file"}. Links expire after a short time for
            your security.
          </p>
          {resetError ? <p className="text-xs text-red-600">{resetError}</p> : null}
          {resetMessage ? <p className="text-xs text-emerald-600">{resetMessage}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="button" variant="secondary" onClick={sendPasswordReset} disabled={resetSending}>
            {resetSending ? "Sending…" : "Email me a reset link"}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Learning preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-700">
          <PreferenceToggle
            id="tutor-mode-toggle"
            label="Tutor mode"
            description="Show guided tutoring prompts while you practice."
            checked={tutorModeEnabled}
            onToggle={toggleTutorMode}
          />
          <PreferenceToggle
            id="dark-mode-toggle"
            label="Dark mode"
            description="Switch to a darker color palette that’s easier on your eyes."
            checked={darkModeEnabled}
            onToggle={toggleDarkMode}
          />
        </CardContent>
      </Card>
    </div>
  );
}

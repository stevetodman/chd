import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";

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
    return <div className="p-6 text-sm text-neutral-600">Loading profile…</div>;
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
    </div>
  );
}

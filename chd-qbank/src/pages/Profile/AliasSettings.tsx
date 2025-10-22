import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";

export async function fetchAliasStatus(client: typeof supabase, userId: string) {
  const { data, error } = await client
    .from("app_users")
    .select("alias, alias_locked")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    return { alias: "", locked: false, error: error.message ?? "Unable to load alias." };
  }
  return {
    alias: data?.alias ?? "",
    locked: Boolean(data?.alias_locked),
    error: null as string | null
  };
}

export async function saveAliasSelection(client: typeof supabase, userId: string, alias: string) {
  const { data, error } = await client
    .from("app_users")
    .update({ alias })
    .eq("id", userId)
    .select("alias, alias_locked")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return {
    alias: data?.alias ?? alias,
    locked: Boolean(data?.alias_locked)
  };
}

export default function AliasSettings() {
  const { session } = useSessionStore();
  const [alias, setAlias] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchAliasStatus(supabase, session.user.id)
      .then(({ alias: nextAlias, locked: nextLocked, error: nextError }) => {
        if (nextError) {
          setError(nextError);
          setAlias("");
          setLocked(false);
        } else {
          setAlias(nextAlias);
          setLocked(nextLocked);
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

    try {
      const result = await saveAliasSelection(supabase, session.user.id, trimmed);
      setAlias(result.alias);
      setLocked(result.locked);
      setMessage("Alias saved! This name is now locked for leaderboard play.");
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Unable to save alias.";
      setError(message);
    }

    setSaving(false);
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
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { SEED_QUESTIONS } from "../lib/constants";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";

export default function Dashboard() {
  const { session } = useSessionStore();
  const [aliasNeeded, setAliasNeeded] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("app_users")
      .select("alias, alias_locked")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (!data.alias || data.alias.trim().length === 0)) {
          setAliasNeeded(true);
        }
      });
  }, [session]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {aliasNeeded ? (
        <Card className="md:col-span-2 border-brand-200 bg-brand-50">
          <CardHeader>
            <CardTitle>Choose your alias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>Set your leaderboard alias in profile settings to participate. Aliases are visible to peers and locked after first save.</p>
            <Link to="/leaderboard" className="text-brand-600 underline">
              View leaderboard guidance
            </Link>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Next up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-700">
          <p>Practice from a curated set of 250 CHD questions in tutor mode.</p>
          <Link to="/practice" className="text-brand-600 underline">
            Resume practice
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Seed content</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-6 text-sm text-neutral-700">
            {SEED_QUESTIONS.map((q) => (
              <li key={q.id}>{q.lead_in}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Games</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Link to="/games/murmurs" className="rounded-lg border border-neutral-200 p-4 hover:border-brand-500">
            Guess the Murmur →
          </Link>
          <Link to="/games/cxr" className="rounded-lg border border-neutral-200 p-4 hover:border-brand-500">
            CXR Sign Match →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

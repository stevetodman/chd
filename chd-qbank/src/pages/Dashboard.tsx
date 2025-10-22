import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { supabase } from "../lib/supabaseClient";
import { useSessionStore } from "../lib/auth";

export interface FeaturedQuestion {
  id: string;
  lead_in: string | null;
}

export async function fetchAliasRequirement(client: typeof supabase, userId: string) {
  const { data, error } = await client
    .from("app_users")
    .select("alias, alias_locked")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    return false;
  }
  if (!data?.alias || data.alias.trim().length === 0) {
    return true;
  }
  return false;
}

export async function loadFeaturedQuestions(client: typeof supabase) {
  const { data, error } = await client
    .from("questions")
    .select("id, lead_in")
    .eq("status", "published")
    .limit(5);
  if (error) {
    return { items: [] as FeaturedQuestion[], error: error.message };
  }
  const randomized = (data ?? []).sort(() => Math.random() - 0.5);
  return {
    items: randomized.map((row) => ({ id: row.id, lead_in: row.lead_in ?? null })),
    error: null as string | null
  };
}

export default function Dashboard() {
  const { session } = useSessionStore();
  const [aliasNeeded, setAliasNeeded] = useState(false);
  const [featured, setFeatured] = useState<FeaturedQuestion[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchAliasRequirement(supabase, session.user.id).then((required) => {
      setAliasNeeded(required);
    });
  }, [session]);

  useEffect(() => {
    setLoadingFeatured(true);
    setFeaturedError(null);
    loadFeaturedQuestions(supabase)
      .then(({ items, error }) => {
        if (error) {
          setFeaturedError(error);
          setFeatured([]);
        } else {
          setFeatured(items);
        }
      })
      .finally(() => {
        setLoadingFeatured(false);
      });
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {aliasNeeded ? (
        <Card className="md:col-span-2 border-brand-200 bg-brand-50">
          <CardHeader>
            <CardTitle>Choose your alias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>
              Set your leaderboard alias in profile settings to participate. Aliases are visible to peers and locked after first
              save.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/profile/alias" className="text-brand-600 underline">
                Go to alias settings
              </Link>
              <Link to="/leaderboard" className="text-brand-600 underline">
                View leaderboard guidance
              </Link>
            </div>
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
          <CardTitle>Published content</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-6 text-sm text-neutral-700">
            {featured.map((q) => (
              <li key={q.id}>{q.lead_in ?? "Practice question"}</li>
            ))}
          </ul>
          {loadingFeatured ? <p className="mt-2 text-xs text-neutral-500">Loading fresh questions…</p> : null}
          {featuredError ? <p className="mt-2 text-xs text-red-600">{featuredError}</p> : null}
          {!loadingFeatured && featured.length === 0 && !featuredError ? (
            <p className="mt-2 text-xs text-neutral-500">No published questions yet.</p>
          ) : null}
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

// supabase/functions/signup-with-code/index.ts
// Deno Edge Function: validates invite code server-side, creates user, seeds alias.
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in Supabase Function env.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials are not configured for the signup-with-code function.");
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const RATE_LIMIT_WINDOW_MS = (() => {
  const raw = Number.parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_WINDOW_MS") ?? "60000", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
})();

const MAX_REQUESTS_PER_WINDOW = (() => {
  const raw = Number.parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_REQUESTS") ?? "5", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
})();

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const payloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  invite_code: z.string().trim().min(1),
  desired_alias: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .optional()
});

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function clientIdentifier(req: Request): string {
  const forwarded =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  try {
    return new URL(req.url).hostname ?? "unknown";
  } catch {
    return "unknown";
  }
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  bucket.count += 1;
  return false;
}

function genAlias(): string {
  const adjectives = ["Brisk", "Calm", "Keen", "Nimble", "Quiet", "Spry", "Sturdy", "Swift", "Tidy", "Witty"];
  const birds = ["Sparrow", "Finch", "Wren", "Robin", "Heron", "Swift", "Kite", "Tern", "Lark", "Ibis"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = birds[Math.floor(Math.random() * birds.length)];
  const n = (100 + Math.floor(Math.random() * 900)).toString();
  return `${a}-${b}-${n}`;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." });
  }

  const identifier = clientIdentifier(req);
  if (isRateLimited(identifier)) {
    return jsonResponse(429, {
      ok: false,
      error: "Too many signup attempts. Please wait a moment before trying again."
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON payload." });
  }

  const parsed = payloadSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return jsonResponse(400, { ok: false, error: "Invalid signup payload." });
  }

  const { email, password, invite_code, desired_alias } = parsed.data;

  try {
    const { data: settings, error: settingsErr } = await sb
      .from("app_settings")
      .select("key,value")
      .in("key", ["invite_code", "invite_expires"]);
    if (settingsErr) {
      console.error("Failed to load invite settings", settingsErr);
      return jsonResponse(503, { ok: false, error: "Signup is temporarily unavailable." });
    }

    const settingsMap = new Map(settings?.map((row) => [row.key, row.value]));
    const code = settingsMap.get("invite_code");
    const expiresRaw = settingsMap.get("invite_expires");

    if (!code || !expiresRaw) {
      console.error("Invite configuration missing in app_settings");
      return jsonResponse(503, { ok: false, error: "Signup is temporarily unavailable." });
    }

    if (invite_code !== code) {
      return jsonResponse(403, { ok: false, error: "Invalid invite code." });
    }

    const expires = new Date(expiresRaw);
    if (Number.isNaN(expires.getTime()) || Date.now() > expires.getTime()) {
      return jsonResponse(403, { ok: false, error: "Invite code has expired." });
    }

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr || !created?.user) {
      console.error("Failed to create Supabase user", createErr);
      return jsonResponse(500, {
        ok: false,
        error: "We couldn't create your account. Please try again later."
      });
    }

    const user = created.user;

    let alias = (desired_alias ?? genAlias()).replace(/[^A-Za-z0-9-]/g, "-").slice(0, 40);
    if (!alias) {
      alias = genAlias();
    }

    for (let i = 0; i < 5; i++) {
      const { data: exists, error: aliasErr } = await sb
        .from("app_users")
        .select("id")
        .eq("alias", alias)
        .limit(1)
        .maybeSingle();
      if (aliasErr) {
        console.error("Alias lookup failed", aliasErr);
        return jsonResponse(500, {
          ok: false,
          error: "We couldn't create your account. Please try again later."
        });
      }
      if (!exists) {
        break;
      }
      alias = genAlias();
    }

    const { error: updateErr } = await sb
      .from("app_users")
      .update({ alias, alias_locked: false })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Failed to persist alias", updateErr);
      return jsonResponse(500, {
        ok: false,
        error: "Your account was created, but we couldn't finish setup. Please contact support."
      });
    }

    return jsonResponse(200, { ok: true, alias, user_id: user.id });
  } catch (error) {
    console.error("Unexpected error during signup", error);
    return jsonResponse(500, {
      ok: false,
      error: "We couldn't create your account. Please try again later."
    });
  }
});

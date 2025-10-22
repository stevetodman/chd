// supabase/functions/signup-with-code/index.ts
// Deno Edge Function: validates invite code server-side, creates user, seeds alias.
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in Supabase Function env.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import { createLogger } from "./logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function genAlias(): string {
  const adjectives = ["Brisk","Calm","Keen","Nimble","Quiet","Spry","Sturdy","Swift","Tidy","Witty"];
  const birds = ["Sparrow","Finch","Wren","Robin","Heron","Swift","Kite","Tern","Lark","Ibis"];
  const a = adjectives[Math.floor(Math.random()*adjectives.length)];
  const b = birds[Math.floor(Math.random()*birds.length)];
  const n = (100 + Math.floor(Math.random()*900)).toString();
  return `${a}-${b}-${n}`;
}

serve(async (req) => {
  const start = performance.now();
  const requestId = crypto.randomUUID();
  const path = new URL(req.url).pathname;
  const ip = extractIp(req.headers);
  const ipHash = await hashValue(ip);
  const logger = createLogger({ requestId, path, ipHash });

  const respond = (
    status: number,
    body: Record<string, unknown>,
    meta: {
      outcome?: string;
      userId?: string;
      error?: string;
      level?: "info" | "error";
    } = {}
  ) => {
    const latencyMs = Math.round(performance.now() - start);
    const level = meta.level ?? (status >= 400 ? "error" : "info");
    const outcome = meta.outcome ?? (status >= 400 ? "error" : "success");
    const logEntry = {
      outcome,
      latencyMs,
      userId: meta.userId,
      error: meta.error
    };

    if (level === "error") {
      logger.error(logEntry);
    } else {
      logger.info(logEntry);
    }

    return new Response(JSON.stringify({ requestId, ...body }), {
      status,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    const { email, password, invite_code, desired_alias } = await req.json();

    const { data: settings, error: settingsErr } = await sb
      .from("app_settings").select("key,value");
    if (settingsErr) throw settingsErr;

    const code = settings?.find((s) => s.key === "invite_code")?.value;
    const expires = settings?.find((s) => s.key === "invite_expires")?.value;
    if (!code || !expires) {
      return respond(
        400,
        { ok: false, error: "Invite not configured" },
        { outcome: "invite_not_configured" }
      );
    }
    if (invite_code !== code) {
      return respond(
        403,
        { ok: false, error: "Invalid invite code" },
        { outcome: "invalid_invite_code" }
      );
    }
    if (new Date() > new Date(expires)) {
      return respond(
        403,
        { ok: false, error: "Invite expired" },
        { outcome: "invite_expired" }
      );
    }

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr) throw createErr;
    const user = created.user;

    let alias = (desired_alias ?? genAlias()).slice(0, 40);
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await sb.from("app_users").select("id").eq("alias", alias).maybeSingle();
      if (!exists) break;
      alias = genAlias();
    }
    await sb.from("app_users").update({ alias, alias_locked: false }).eq("id", user.id);

    return respond(
      200,
      { ok: true, alias, user_id: user.id },
      { outcome: "success", userId: user.id }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return respond(
      400,
      { ok: false, error: errorMessage },
      { outcome: "exception", error: errorMessage, level: "error" }
    );
  }
});

function extractIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

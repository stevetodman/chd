// supabase/functions/signup-with-code/index.ts
// Hardened Deno Edge Function for invite-based signup flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { timingSafeEqual } from "https://deno.land/std@0.177.0/crypto/timing_safe_equal.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

type RateBucket = {
  tokens: number;
  lastRefillMs: number;
};

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = (() => {
  const raw = Deno.env.get("SIGNUP_RATE_LIMIT_MAX_REQUESTS");
  if (!raw) return 5;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

const rateLimiter = new Map<string, RateBucket>();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Missing SUPABASE_URL environment variable",
      context: "bootstrap",
    }),
  );
  throw new Error("SUPABASE_URL is required");
}

if (!SERVICE_ROLE_KEY) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Missing SUPABASE_SERVICE_ROLE_KEY secret",
      context: "bootstrap",
    }),
  );
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const requestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  invite_code: z.string().min(1).max(128),
  desired_alias: z.string().trim().min(1).max(40).optional(),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeAlias(alias: string | undefined): string | undefined {
  if (!alias) return undefined;
  return alias.trim().replace(/\s+/g, "-").toLowerCase().slice(0, 40);
}

function getClientIp(req: Request, info: Deno.ServeHandlerInfo | undefined): string | undefined {
  const header = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (header) {
    const parts = header.split(",");
    if (parts.length > 0) {
      return parts[0].trim();
    }
  }
  if (info && info.remoteAddr && "hostname" in info.remoteAddr) {
    return info.remoteAddr.hostname;
  }
  return undefined;
}

function refillTokens(bucket: RateBucket, nowMs: number) {
  const elapsed = nowMs - bucket.lastRefillMs;
  if (elapsed <= 0) return;
  const refillRate = RATE_LIMIT_MAX_REQUESTS / RATE_LIMIT_WINDOW_MS; // tokens per ms
  bucket.tokens = Math.min(
    RATE_LIMIT_MAX_REQUESTS,
    bucket.tokens + elapsed * refillRate,
  );
  bucket.lastRefillMs = nowMs;
}

function takeToken(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = rateLimiter.get(key) ?? {
    tokens: RATE_LIMIT_MAX_REQUESTS,
    lastRefillMs: now,
  };
  refillTokens(bucket, now);
  let allowed = false;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    allowed = true;
  }
  rateLimiter.set(key, bucket);
  if (allowed) return { allowed: true };
  const refillRate = RATE_LIMIT_MAX_REQUESTS / RATE_LIMIT_WINDOW_MS;
  const missingTokens = 1 - bucket.tokens;
  const waitMs = Math.ceil(Math.max(0, missingTokens) / refillRate);
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
}

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function createLogContext(base: Record<string, unknown>, level: "info" | "error") {
  const payload = { level, ...base };
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  const len = Math.max(a.length, b.length, 1);
  const encoder = new TextEncoder();
  const bufA = new Uint8Array(len);
  const bufB = new Uint8Array(len);
  bufA.set(encoder.encode(a).slice(0, len));
  bufB.set(encoder.encode(b).slice(0, len));
  const isEqual = timingSafeEqual(bufA, bufB);
  return isEqual && a.length === b.length && a === b;
}

async function claimAlias(
  userId: string,
  desiredAlias: string | undefined,
): Promise<{ alias: string } | { error: Error }> {
  const attempts = 10;
  const existingRoleRes = await sb
    .from("app_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = existingRoleRes.data?.role ?? "student";
  if (existingRoleRes.error && existingRoleRes.error.code !== "PGRST116") {
    return { error: existingRoleRes.error };
  }

  // Remove the placeholder row inserted by trigger (if present) so we can rely on INSERT for concurrency safety.
  const { error: deleteErr } = await sb.from("app_users").delete().eq("id", userId);
  if (deleteErr && deleteErr.code !== "PGRST116") {
    return { error: deleteErr };
  }

  const restorePlaceholder = async () => {
    await sb.from("app_users").insert({ id: userId, role }).select();
  };

  try {
    let aliasCandidate = desiredAlias ?? genAlias();
    for (let i = 0; i < attempts; i++) {
      const { data, error } = await sb
        .from("app_users")
        .insert(
          { id: userId, role, alias: aliasCandidate, alias_locked: false },
          { onConflict: "alias", ignoreDuplicates: true },
        )
        .select("alias")
        .maybeSingle();
      if (error) {
        if (error.code === "23505") {
          aliasCandidate = genAlias();
          continue;
        }
        return { error };
      }
      if (data?.alias) {
        return { alias: data.alias };
      }
      // alias conflict without error (ignored due to ON CONFLICT DO NOTHING)
      aliasCandidate = genAlias();
    }
    await restorePlaceholder();
    return { error: new Error("Failed to allocate unique alias") };
  } catch (err) {
    await restorePlaceholder();
    return { error: err as Error };
  }
}

function genAlias(): string {
  const adjectives = [
    "Brisk",
    "Calm",
    "Keen",
    "Nimble",
    "Quiet",
    "Spry",
    "Sturdy",
    "Swift",
    "Tidy",
    "Witty",
  ];
  const birds = [
    "Sparrow",
    "Finch",
    "Wren",
    "Robin",
    "Heron",
    "Swift",
    "Kite",
    "Tern",
    "Lark",
    "Ibis",
  ];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = birds[Math.floor(Math.random() * birds.length)];
  const n = (100 + Math.floor(Math.random() * 900)).toString();
  return `${a}-${b}-${n}`;
}

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers ?? {});
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

serve(async (req, info) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const ip = getClientIp(req, info) ?? "unknown";
  const ipHashPromise = hashValue(ip);
  let emailForLog = "";
  let emailHashPromise: Promise<string> | undefined;
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      const logPayload = {
        msg: "Invalid JSON body",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        outcome: "invalid_json",
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "invalid_json", message: "Request body must be valid JSON" } }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message);
      const logPayload = {
        msg: "Validation failed",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        outcome: "invalid_body",
        issues,
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "invalid_body", message: "Invalid request body", details: issues } }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    emailForLog = normalizedEmail;
    emailHashPromise = hashValue(normalizedEmail);
    const aliasInput = sanitizeAlias(parsed.data.desired_alias);
    const rateKey = `${ip}|${normalizedEmail}`;
    const rate = takeToken(rateKey);
    if (!rate.allowed) {
      const logPayload = {
        msg: "Rate limited",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "rate_limited",
        retry_after: rate.retryAfterSeconds,
      };
      createLogContext(logPayload, "error");
      return jsonResponse(
        { error: { code: "rate_limited", message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": rate.retryAfterSeconds.toString() } },
      );
    }

    const { data: settingsRows, error: settingsErr } = await sb
      .from("app_settings")
      .select("key,value")
      .in("key", ["invite_code", "invite_expires"]);
    if (settingsErr) {
      const logPayload = {
        msg: "Failed to load settings",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "error_loading_settings",
        error: settingsErr.message,
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "settings_unavailable", message: "Unable to load application settings" } }, { status: 503 });
    }

    const settings = new Map(settingsRows?.map((row) => [row.key, row.value] as const));
    const inviteCodeSetting = settings.get("invite_code");
    const inviteExpiresSetting = settings.get("invite_expires");
    if (!inviteCodeSetting || !inviteExpiresSetting) {
      const missing = [
        !inviteCodeSetting ? "invite_code" : null,
        !inviteExpiresSetting ? "invite_expires" : null,
      ].filter(Boolean);
      const logPayload = {
        msg: "Missing required settings",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "settings_missing",
        missing,
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "settings_missing", message: "Required configuration missing", missing } }, { status: 503 });
    }

    if (!(await constantTimeEquals(parsed.data.invite_code, inviteCodeSetting))) {
      const logPayload = {
        msg: "Invalid invite code",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "invalid_invite_code",
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "invalid_invite", message: "Invalid invite code" } }, { status: 403 });
    }

    const expires = new Date(inviteExpiresSetting);
    if (Number.isNaN(expires.getTime()) || Date.now() > expires.getTime()) {
      const logPayload = {
        msg: "Invite expired",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "invite_expired",
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "invite_expired", message: "Invite has expired" } }, { status: 403 });
    }

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: normalizedEmail,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (createErr) {
      const logPayload = {
        msg: "Failed to create user",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "user_creation_failed",
        error: createErr.message,
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "user_creation_failed", message: "Unable to create user" } }, { status: 500 });
    }

    const user = created.user;
    const aliasResult = await claimAlias(user.id, aliasInput);
    if ("error" in aliasResult) {
      const logPayload = {
        msg: "Alias allocation failed",
        request_id: requestId,
        ip_hash: await ipHashPromise,
        email_hash: await emailHashPromise,
        outcome: "alias_allocation_failed",
        error: aliasResult.error.message,
      };
      createLogContext(logPayload, "error");
      return jsonResponse({ error: { code: "alias_allocation_failed", message: "Could not allocate alias" } }, { status: 500 });
    }

    const successLog = {
      msg: "Signup completed",
      request_id: requestId,
      ip_hash: await ipHashPromise,
      email_hash: await emailHashPromise,
      outcome: "created",
      user_id: user.id,
    };
    createLogContext(successLog, "info");

    return jsonResponse(
      { user_id: user.id, alias: aliasResult.alias },
      { status: 201 },
    );
  } catch (err) {
    const logPayload = {
      msg: "Unhandled error",
      request_id: requestId,
      ip_hash: await ipHashPromise,
      email_hash: emailForLog
        ? await (emailHashPromise ?? hashValue(emailForLog))
        : undefined,
      outcome: "unhandled_error",
      error: err instanceof Error ? err.message : String(err),
    };
    createLogContext(logPayload, "error");
    return jsonResponse({ error: { code: "internal_error", message: "Internal server error" } }, { status: 500 });
  }
});

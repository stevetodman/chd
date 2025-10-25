/**
 * Supabase Edge Function: `signup-with-code`
 *
 * This function implements an idempotent invite-signup flow for the CHD Qbank.
 * Each client request must include an `Idempotency-Key`. When a request arrives we:
 *
 * 1. Reuse any cached response for the key if it is younger than ten minutes.
 * 2. Otherwise attempt to "claim" the key so only one concurrent mutation runs.
 * 3. Validate the invite code using a salted hash stored in `app_settings` and enforce
 *    an optional expiration timestamp.
 * 4. Create the user via the Supabase Admin API, trigger the confirmation email, and
 *    claim a unique alias via a stored procedure.
 * 5. Persist the response payload for subsequent retries under the same key.
 *
 * The function relies on the `idempotency_keys` table for coordination and will
 * respond with a stored result when duplicate requests arrive. Environment
 * variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be configured.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const RATE_LIMIT_KEY_PREFIX = "signup_rl::";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_BASE_BLOCK_MS = 2 * 60 * 1000;
const RATE_LIMIT_MAX_BLOCK_MS = 60 * 60 * 1000;
const RATE_LIMIT_RECENT_KEYS = 10;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

type StoredResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

type RateLimitState = {
  attempts: number;
  window_started_at: string;
  last_attempt_at: string;
  blocked_until?: string;
  ip: string;
  user_agent: string;
  recent_keys: string[];
  success_count: number;
  error_count: number;
  last_status_code?: number;
};

type IdempotencyRow = {
  key: string;
  response: unknown;
  status_code: number | null;
  created_at: string;
};

/**
 * Derive a SHA-256 hash for the invite code using the supplied salt.
 *
 * @param code - Plain-text invite code submitted by the user.
 * @param salt - Unique per-install salt stored in `app_settings`.
 * @returns Hex encoded hash string that can be compared with the stored hash.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const payload = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashInviteCode(code: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${code}`);
}

/**
 * Compare two strings in constant-time to avoid leaking timing information.
 *
 * @param a - First string operand.
 * @param b - Second string operand.
 * @returns True when the strings are identical.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Generate a pseudo-random alias consisting of an adjective, a bird, and a suffix.
 *
 * @returns Friendly alias such as `Swift-Ibis-428` used as a default username.
 */
function genAlias(): string {
  const adjectives = ["Brisk","Calm","Keen","Nimble","Quiet","Spry","Sturdy","Swift","Tidy","Witty"];
  const birds = ["Sparrow","Finch","Wren","Robin","Heron","Swift","Kite","Tern","Lark","Ibis"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = birds[Math.floor(Math.random() * birds.length)];
  const n = (100 + Math.floor(Math.random() * 900)).toString();
  return `${a}-${b}-${n}`;
}

/**
 * Utility helper that resolves after a given number of milliseconds.
 *
 * @param ms - Milliseconds to wait before resolving.
 */
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine whether the stored idempotency response is still fresh enough to reuse.
 *
 * @param row - Row fetched from `idempotency_keys`.
 * @returns True when the row is younger than the 10 minute TTL.
 */
function withinTtl(row: IdempotencyRow): boolean {
  return Date.now() - new Date(row.created_at).getTime() < TEN_MINUTES_MS;
}

/**
 * Load the idempotency row for the supplied key if it exists.
 *
 * @param key - Idempotency token provided by the client.
 * @returns The matching row or `null` when the key has not been seen.
 */
async function fetchIdempotencyRow(key: string): Promise<IdempotencyRow | null> {
  const { data, error } = await sb
    .from("idempotency_keys")
    .select("key,response,status_code,created_at")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as IdempotencyRow | null) ?? null;
}

/**
 * Convert a serialized response payload into a native `Response` object.
 *
 * @param stored - Response metadata captured in the database.
 * @returns A `Response` suitable for returning from the Edge Function.
 */
function buildResponse(stored: StoredResponse): Response {
  const headers = new Headers(stored.headers ?? {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(stored.body), {
    status: stored.status,
    headers
  });
}

function isStoredResponse(value: unknown): value is StoredResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.status === "number" &&
    "body" in candidate &&
    (candidate.headers === undefined || typeof candidate.headers === "object")
  );
}

function parseRateLimitState(value: unknown): RateLimitState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.attempts !== "number" ||
    typeof raw.window_started_at !== "string" ||
    typeof raw.last_attempt_at !== "string"
  ) {
    return null;
  }

  const recent = Array.isArray(raw.recent_keys)
    ? (raw.recent_keys as unknown[]).filter((item): item is string => typeof item === "string")
    : [];

  return {
    attempts: raw.attempts,
    window_started_at: raw.window_started_at,
    last_attempt_at: raw.last_attempt_at,
    blocked_until: typeof raw.blocked_until === "string" ? raw.blocked_until : undefined,
    ip: typeof raw.ip === "string" ? raw.ip : "unknown",
    user_agent: typeof raw.user_agent === "string" ? raw.user_agent : "unknown",
    recent_keys: recent,
    success_count: typeof raw.success_count === "number" ? raw.success_count : 0,
    error_count: typeof raw.error_count === "number" ? raw.error_count : 0,
    last_status_code: typeof raw.last_status_code === "number" ? raw.last_status_code : undefined
  };
}

function appendRecentKey(existing: string[], next: string): string[] {
  const deduped = existing.filter((item) => item !== next);
  deduped.push(next);
  if (deduped.length > RATE_LIMIT_RECENT_KEYS) {
    return deduped.slice(deduped.length - RATE_LIMIT_RECENT_KEYS);
  }
  return deduped;
}

function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("forwarded");
  if (forwarded) {
    const match = forwarded.match(/for=([^;]+)/i);
    if (match) {
      const forwardedIp = match[1].trim().replace(/^"|"$/g, "");
      if (forwardedIp && forwardedIp.toLowerCase() !== "unknown") {
        return forwardedIp;
      }
    }
  }

  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const candidate = xForwardedFor.split(",").map((part) => part.trim()).find(Boolean);
    if (candidate) {
      return candidate;
    }
  }

  const headers = ["cf-connecting-ip", "x-real-ip", "x-client-ip", "true-client-ip"];
  for (const header of headers) {
    const value = req.headers.get(header);
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }

  return "unknown";
}

async function deriveRateLimitBucket(req: Request): Promise<{ key: string; ip: string; userAgent: string }> {
  const ip = extractClientIp(req);
  const userAgent = (req.headers.get("user-agent") ?? "unknown").slice(0, 200);
  const hash = await sha256Hex(`${ip}|${userAgent}`);
  return {
    key: `${RATE_LIMIT_KEY_PREFIX}${hash}`,
    ip,
    userAgent
  };
}

function buildRateLimitResponse(retryAfterSeconds: number): Response {
  const message = retryAfterSeconds > 0
    ? `Too many signup attempts. Try again in ${retryAfterSeconds} seconds.`
    : "Too many signup attempts. Please slow down and try again later.";
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": retryAfterSeconds.toString()
    }
  });
}

async function saveRateLimitState(key: string, state: RateLimitState, blocked: boolean) {
  const payload: RateLimitState = {
    ...state,
    blocked_until: state.blocked_until
  };
  const { error } = await sb
    .from("idempotency_keys")
    .upsert({
      key,
      response: payload,
      status_code: blocked ? 429 : 200,
      created_at: new Date().toISOString()
    });
  if (error) {
    throw error;
  }
}

type RateLimitDecision =
  | { blocked: true; response: Response }
  | { blocked: false; key: string };

async function registerRateLimitAttempt(idempotencyKey: string, req: Request): Promise<RateLimitDecision> {
  const now = new Date();
  const nowMs = now.getTime();
  const bucket = await deriveRateLimitBucket(req);
  const row = await fetchIdempotencyRow(bucket.key);
  let state = parseRateLimitState(row?.response) ?? {
    attempts: 0,
    window_started_at: now.toISOString(),
    last_attempt_at: now.toISOString(),
    ip: bucket.ip,
    user_agent: bucket.userAgent,
    recent_keys: [],
    success_count: 0,
    error_count: 0
  };

  state.ip = bucket.ip;
  state.user_agent = bucket.userAgent;
  const alreadySeen = state.recent_keys.includes(idempotencyKey);
  state.recent_keys = appendRecentKey(state.recent_keys, idempotencyKey);

  const nowIso = now.toISOString();
  const blockedUntilMs = state.blocked_until ? new Date(state.blocked_until).getTime() : null;

  if (blockedUntilMs && blockedUntilMs > nowMs) {
    let nextUntilMs = blockedUntilMs;
    if (!alreadySeen) {
      const remaining = Math.max(0, blockedUntilMs - nowMs);
      const extendedDuration = Math.min(RATE_LIMIT_MAX_BLOCK_MS, remaining + RATE_LIMIT_BASE_BLOCK_MS);
      nextUntilMs = nowMs + extendedDuration;
      state.attempts += 1;
    }
    state.blocked_until = new Date(nextUntilMs).toISOString();
    state.last_attempt_at = nowIso;
    state.last_status_code = 429;
    state.error_count += 1;
    await saveRateLimitState(bucket.key, state, true);
    const retryAfter = Math.max(1, Math.ceil((nextUntilMs - nowMs) / 1000));
    console.warn("signup-with-code rate limit: blocked attempt", {
      idempotencyKey,
      ip: bucket.ip,
      userAgent: bucket.userAgent,
      retryAfter
    });
    return { blocked: true, response: buildRateLimitResponse(retryAfter) };
  }

  if (blockedUntilMs && blockedUntilMs <= nowMs) {
    state.blocked_until = undefined;
    state.attempts = 0;
    state.window_started_at = nowIso;
  }

  const windowStartMs = new Date(state.window_started_at).getTime();
  if (nowMs - windowStartMs > RATE_LIMIT_WINDOW_MS) {
    state.attempts = 0;
    state.window_started_at = nowIso;
  }

  if (!alreadySeen) {
    state.attempts += 1;
  }
  state.last_attempt_at = nowIso;

  if (state.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    const overflow = state.attempts - RATE_LIMIT_MAX_ATTEMPTS;
    const penalty = Math.min(
      RATE_LIMIT_MAX_BLOCK_MS,
      RATE_LIMIT_BASE_BLOCK_MS * Math.pow(2, Math.max(0, overflow - 1))
    );
    state.blocked_until = new Date(nowMs + penalty).toISOString();
    state.last_status_code = 429;
    state.error_count += 1;
    await saveRateLimitState(bucket.key, state, true);
    const retryAfter = Math.max(1, Math.ceil(penalty / 1000));
    console.warn("signup-with-code rate limit: threshold exceeded", {
      idempotencyKey,
      ip: bucket.ip,
      userAgent: bucket.userAgent,
      attempts: state.attempts,
      retryAfter
    });
    return { blocked: true, response: buildRateLimitResponse(retryAfter) };
  }

  state.blocked_until = undefined;
  await saveRateLimitState(bucket.key, state, false);

  return { blocked: false, key: bucket.key };
}

async function annotateRateLimitOutcome(rateLimitKey: string, status: number) {
  const row = await fetchIdempotencyRow(rateLimitKey);
  if (!row) {
    return;
  }
  const state = parseRateLimitState(row.response);
  if (!state) {
    return;
  }

  const isSuccess = status >= 200 && status < 300;
  state.last_status_code = status;
  state.success_count = isSuccess ? state.success_count + 1 : state.success_count;
  state.error_count = !isSuccess ? state.error_count + 1 : state.error_count;

  const { error } = await sb
    .from("idempotency_keys")
    .upsert({
      key: rateLimitKey,
      response: state,
      status_code: status,
      created_at: new Date().toISOString()
    });
  if (error) {
    throw error;
  }
}

/**
 * Poll the table for a stored response while another request finalizes.
 *
 * @param key - Idempotency key currently being processed by another worker.
 * @returns The stored response if it materializes before the timeout, otherwise `null`.
 */
async function waitForStoredResponse(key: string): Promise<Response | null> {
  const MAX_WAIT_MS = 10000;
  const POLL_INTERVAL_MS = 200;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const row = await fetchIdempotencyRow(key);
    if (!row) {
      return null;
    }
    if (row.response && isStoredResponse(row.response) && withinTtl(row)) {
      return buildResponse(row.response);
    }
    if (!withinTtl(row)) {
      return null;
    }
    await delay(POLL_INTERVAL_MS);
  }

  return null;
}

/**
 * Delete idempotency rows that have aged past the TTL to allow reprocessing.
 *
 * @param key - Idempotency key that should be released.
 * @param cutoffIso - ISO timestamp representing the minimum creation date to keep.
 */
async function removeExpiredKey(key: string, cutoffIso: string) {
  const { error } = await sb
    .from("idempotency_keys")
    .delete()
    .eq("key", key)
    .lt("created_at", cutoffIso);
  if (error) {
    throw error;
  }
}

/**
 * Attempt to claim ownership of an idempotency key for the current request.
 *
 * @param key - Idempotency key provided by the client.
 * @returns True when the insert succeeds, false when another process already claimed it.
 */
async function claimIdempotencyKey(key: string): Promise<boolean> {
  const { error } = await sb.from("idempotency_keys").insert({ key });
  if (!error) {
    return true;
  }
  if (error.code === "23505") {
    return false;
  }
  throw error;
}

/**
 * Persist the computed response for the idempotent request.
 *
 * @param key - Idempotency key that should be associated with the result.
 * @param stored - Response payload, headers, and status code to store.
 */
async function storeResponseForKey(key: string, stored: StoredResponse) {
  const { error } = await sb
    .from("idempotency_keys")
    .update({
      response: stored,
      status_code: stored.status,
      created_at: new Date().toISOString()
    })
    .eq("key", key);
  if (error) {
    throw error;
  }
}

/**
 * Coerce arbitrary thrown values into a consistent status/message shape.
 *
 * @param err - Unknown error raised during request handling.
 * @returns Normalized status code and error message suitable for JSON output.
 */
function normalizeError(err: unknown): { status: number; message: string } {
  if (typeof err === "object" && err !== null) {
    const status = typeof (err as { status?: unknown }).status === "number" ? (err as { status: number }).status : 400;
    const message = typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : String(err);
    return { status, message };
  }
  return { status: 400, message: String(err) };
}

/**
 * Handle the HTTP request, enforcing idempotency while validating the invite code
 * and provisioning a new user record when allowed.
 *
 * @param req - Incoming HTTP request from Supabase Edge runtime.
 * @returns HTTP response describing success or failure of the signup attempt.
 */
serve(async (req) => {
  const idempotencyKey = req.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing Idempotency-Key header" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const cutoffIso = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
  let rateLimitKeyForAudit: string | null = null;

  const existingRow = await fetchIdempotencyRow(idempotencyKey);
  if (existingRow && isStoredResponse(existingRow.response) && withinTtl(existingRow)) {
    return buildResponse(existingRow.response);
  }
  if (existingRow && !withinTtl(existingRow)) {
    await removeExpiredKey(idempotencyKey, cutoffIso);
  }

  try {
    const decision = await registerRateLimitAttempt(idempotencyKey, req);
    if (decision.blocked) {
      return decision.response;
    }
    rateLimitKeyForAudit = decision.key;
  } catch (err) {
    const { status, message } = normalizeError(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status,
      headers: { "content-type": "application/json" }
    });
  }

  let claimed = await claimIdempotencyKey(idempotencyKey);
  if (!claimed) {
    const pending = await waitForStoredResponse(idempotencyKey);
    if (pending) {
      return pending;
    }
    await removeExpiredKey(idempotencyKey, cutoffIso);
    claimed = await claimIdempotencyKey(idempotencyKey);
    if (!claimed) {
      return new Response(JSON.stringify({ ok: false, error: "Request is already in progress" }), {
        status: 409,
        headers: { "content-type": "application/json" }
      });
    }
  }

  let storedResponse: StoredResponse;

  try {
    const { email, password, invite_code, desired_alias } = await req.json();

    if (typeof invite_code !== "string" || invite_code.trim() === "") {
      throw new Error("Invite code required");
    }

    const { data: settings, error: settingsErr } = await sb
      .from("app_settings")
      .select("key,value")
      .in("key", ["invite_code_hash", "invite_code_salt", "invite_expires"]);
    if (settingsErr) throw settingsErr;

    const inviteCodeHash = settings?.find((s) => s.key === "invite_code_hash")?.value;
    const inviteCodeSalt = settings?.find((s) => s.key === "invite_code_salt")?.value;
    const expires = settings?.find((s) => s.key === "invite_expires")?.value;
    if (!inviteCodeHash || !inviteCodeSalt) {
      throw new Error("Invite not configured securely");
    }
    if (!expires) {
      throw new Error("Invite expiration missing");
    }

    const submittedHash = await hashInviteCode(invite_code.trim(), inviteCodeSalt);
    if (!timingSafeEqual(inviteCodeHash, submittedHash)) {
      storedResponse = {
        status: 403,
        body: { ok: false, error: "Invalid invite code" },
        headers: { "content-type": "application/json" }
      };
      await storeResponseForKey(idempotencyKey, storedResponse);
      return buildResponse(storedResponse);
    }
    if (new Date() > new Date(expires)) {
      storedResponse = {
        status: 403,
        body: { ok: false, error: "Invite expired" },
        headers: { "content-type": "application/json" }
      };
      await storeResponseForKey(idempotencyKey, storedResponse);
      return buildResponse(storedResponse);
    }

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password
    });
    if (createErr) throw createErr;
    const user = created.user;

    const { error: resendError } = await sb.auth.admin.resend({
      type: "signup",
      email
    });
    if (resendError) throw resendError;

    let attemptAlias = (desired_alias ?? genAlias()).slice(0, 40);
    let finalAlias: string | null = null;

    for (let i = 0; i < 5; i++) {
      const { data: aliasResult, error: aliasError } = await sb.rpc<string>("claim_user_alias", {
        p_user_id: user.id,
        p_alias: attemptAlias,
        p_alias_locked: false
      });

      if (!aliasError) {
        finalAlias = aliasResult ?? attemptAlias;
        break;
      }

      if (
        aliasError.code === "23505" ||
        (aliasError.code === "P0001" && aliasError.message === "alias_conflict")
      ) {
        attemptAlias = genAlias().slice(0, 40);
        continue;
      }

      throw aliasError;
    }

    if (!finalAlias) {
      throw new Error("Unable to assign alias");
    }

    storedResponse = {
      status: 200,
      body: { ok: true, alias: finalAlias, user_id: user.id },
      headers: { "content-type": "application/json" }
    };
  } catch (err) {
    const { status, message } = normalizeError(err);
    storedResponse = {
      status,
      body: { ok: false, error: message },
      headers: { "content-type": "application/json" }
    };
  }

  await storeResponseForKey(idempotencyKey, storedResponse);
  if (rateLimitKeyForAudit) {
    try {
      await annotateRateLimitOutcome(rateLimitKeyForAudit, storedResponse.status);
    } catch (auditError) {
      console.error("signup-with-code rate limit audit failure", auditError);
    }
  }
  return buildResponse(storedResponse);
});

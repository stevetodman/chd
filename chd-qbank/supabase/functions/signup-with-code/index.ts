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

type IdempotencyRow = {
  key: string;
  response: StoredResponse | null;
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
async function hashInviteCode(code: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  const pick = (count: number): number => {
    if (count <= 0) {
      throw new Error("Cannot pick an index from an empty collection");
    }
    const candidates = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / count) * count;
    let value = 0xffffffff;
    while (value >= limit) {
      crypto.getRandomValues(candidates);
      value = candidates[0];
    }
    return value % count;
  };

  const a = adjectives[pick(adjectives.length)];
  const b = birds[pick(birds.length)];
  const n = (100 + pick(900)).toString();
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
    if (row.response && withinTtl(row)) {
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

  const existingRow = await fetchIdempotencyRow(idempotencyKey);
  if (existingRow && existingRow.response && withinTtl(existingRow)) {
    return buildResponse(existingRow.response);
  }
  if (existingRow && !withinTtl(existingRow)) {
    await removeExpiredKey(idempotencyKey, cutoffIso);
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
  return buildResponse(storedResponse);
});

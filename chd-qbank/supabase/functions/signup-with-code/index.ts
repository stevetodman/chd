// supabase/functions/signup-with-code/index.ts
// Deno Edge Function: validates invite code server-side, creates user, seeds alias.
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in Supabase Function env.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { TEN_MINUTES_MS, validateInviteCode, withinTtl, type IdempotencyRow, type StoredResponse } from "./logic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function genAlias(): string {
  const adjectives = ["Brisk","Calm","Keen","Nimble","Quiet","Spry","Sturdy","Swift","Tidy","Witty"];
  const birds = ["Sparrow","Finch","Wren","Robin","Heron","Swift","Kite","Tern","Lark","Ibis"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = birds[Math.floor(Math.random() * birds.length)];
  const n = (100 + Math.floor(Math.random() * 900)).toString();
  return `${a}-${b}-${n}`;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const inviteValidation = await validateInviteCode({ supabase: sb, inviteCode: invite_code });
    if (inviteValidation) {
      storedResponse = inviteValidation;
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

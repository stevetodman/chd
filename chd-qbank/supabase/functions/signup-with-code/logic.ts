export const TEN_MINUTES_MS = 10 * 60 * 1000;

export type StoredResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export type IdempotencyRow = {
  key: string;
  response: StoredResponse | null;
  status_code: number | null;
  created_at: string;
};

export type AppSettingRow = {
  key: string;
  value: string;
};

export type SupabaseLike = {
  from: (
    table: string
  ) => {
    select: (columns: string) => {
      in: (
        column: string,
        values: string[]
      ) => Promise<{
        data: AppSettingRow[] | null;
        error: { message: string; code?: string } | null;
      }>;
    };
  };
};

export async function hashInviteCode(code: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function withinTtl(row: IdempotencyRow, now: () => number = () => Date.now()): boolean {
  return now() - new Date(row.created_at).getTime() < TEN_MINUTES_MS;
}

export type ValidateInviteOptions = {
  supabase: SupabaseLike;
  inviteCode: string;
  now?: () => Date;
  hash?: typeof hashInviteCode;
  equals?: typeof timingSafeEqual;
};

export async function validateInviteCode({
  supabase,
  inviteCode,
  now = () => new Date(),
  hash = hashInviteCode,
  equals = timingSafeEqual
}: ValidateInviteOptions): Promise<StoredResponse | null> {
  const trimmed = inviteCode.trim();
  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["invite_code_hash", "invite_code_salt", "invite_expires"]);

  if (error) {
    throw error;
  }

  const inviteCodeHash = data?.find((setting) => setting.key === "invite_code_hash")?.value;
  const inviteCodeSalt = data?.find((setting) => setting.key === "invite_code_salt")?.value;
  const expiresIso = data?.find((setting) => setting.key === "invite_expires")?.value;

  if (!inviteCodeHash || !inviteCodeSalt) {
    throw new Error("Invite not configured securely");
  }

  if (!expiresIso) {
    throw new Error("Invite expiration missing");
  }

  const submittedHash = await hash(trimmed, inviteCodeSalt);
  if (!equals(inviteCodeHash, submittedHash)) {
    return {
      status: 403,
      body: { ok: false, error: "Invalid invite code" },
      headers: { "content-type": "application/json" }
    };
  }

  const nowDate = now();
  const expiration = new Date(expiresIso);
  if (nowDate > expiration) {
    return {
      status: 403,
      body: { ok: false, error: "Invite expired" },
      headers: { "content-type": "application/json" }
    };
  }

  return null;
}

import { supabase } from "./supabaseClient";
import { normalizeEmailAddress } from "./utils";

type SignupResponse =
  | { ok: true; user: { id: string; email: string }; message?: string }
  | { ok: false; error?: string | null };

type SupabaseFunctionsError = {
  name?: string;
  message?: string;
};

export class SignupServiceUnavailableError extends Error {
  constructor() {
    super("SIGNUP_SERVICE_UNAVAILABLE");
    this.name = "SignupServiceUnavailableError";
  }
}

export async function signUpWithInvite(email: string, password: string, code: string, alias?: string) {
  const { data, error } = await supabase.functions.invoke<SignupResponse>("signup-with-code", {
    body: { email: normalizeEmailAddress(email), password, invite_code: code, alias },
    headers: { "Idempotency-Key": crypto.randomUUID() }
  });

  if (error) {
    const name = (error as SupabaseFunctionsError)?.name;
    if (name === "FunctionsFetchError") {
      throw new SignupServiceUnavailableError();
    }
    throw error;
  }

  if (!data || data.ok !== true) {
    const message = data?.ok === false ? data?.error : null;
    throw new Error(message || "SIGNUP_FAILED");
  }

  return data;
}

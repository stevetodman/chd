type SupabaseTestEnv = {
  url: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
};

type RuntimeEnv = Record<string, string | undefined>;

const normalize = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveRuntimeEnv = (): RuntimeEnv => {
  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    return import.meta.env as RuntimeEnv;
  }

  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    return process.env as RuntimeEnv;
  }

  return {};
};

const runtimeEnv = resolveRuntimeEnv();
const nodeEnv =
  typeof process !== "undefined" && typeof process.env !== "undefined"
    ? (process.env as RuntimeEnv)
    : undefined;

const supabaseTestEnv: SupabaseTestEnv = {
  url: normalize(runtimeEnv.VITE_SUPABASE_URL ?? runtimeEnv.SUPABASE_URL ?? nodeEnv?.SUPABASE_URL),
  anonKey: normalize(
    runtimeEnv.VITE_SUPABASE_ANON_KEY ?? runtimeEnv.SUPABASE_ANON_KEY ?? nodeEnv?.SUPABASE_ANON_KEY,
  ),
  serviceRoleKey: normalize(nodeEnv?.SUPABASE_SERVICE_ROLE_KEY),
};

const hasAnonCredentials =
  supabaseTestEnv.url !== null && supabaseTestEnv.anonKey !== null;

const hasServiceCredentials =
  supabaseTestEnv.url !== null && supabaseTestEnv.serviceRoleKey !== null;

export type { SupabaseTestEnv };
export { hasAnonCredentials, hasServiceCredentials, supabaseTestEnv };

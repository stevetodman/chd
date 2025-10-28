type SupabaseTestEnv = {
  url: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
};

const normalize = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const supabaseTestEnv: SupabaseTestEnv = {
  url: normalize(process.env.SUPABASE_URL),
  anonKey: normalize(process.env.SUPABASE_ANON_KEY),
  serviceRoleKey: normalize(process.env.SUPABASE_SERVICE_ROLE_KEY),
};

const hasAnonCredentials =
  supabaseTestEnv.url !== null && supabaseTestEnv.anonKey !== null;

const hasServiceCredentials =
  supabaseTestEnv.url !== null && supabaseTestEnv.serviceRoleKey !== null;

export type { SupabaseTestEnv };
export { hasAnonCredentials, hasServiceCredentials, supabaseTestEnv };

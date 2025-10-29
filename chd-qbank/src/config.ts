import { z } from "zod";

type RuntimeEnv = Record<string, unknown>;

const toBoolean = (value: string | boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const booleanLike = z.union([z.boolean(), z.string()]).transform(toBoolean);

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_APP_NAME: z.string().optional(),
  NODE_ENV: z.string().optional(),
  MODE: z.string().optional(),
  DEV: booleanLike.optional(),
  PROD: booleanLike.optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const resolveRuntimeEnv = (): RuntimeEnv => {
  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    return import.meta.env as unknown as RuntimeEnv;
  }

  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    return process.env;
  }

  return {};
};

const env = envSchema.parse(resolveRuntimeEnv());

const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? null;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? null;

const optionalSupabase = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type OptionalSupabaseConfig = {
  url: string | null;
  anonKey: string | null;
};

const ensureSupabaseConfig = (): SupabaseConfig => {
  const missing: string[] = [];

  if (!supabaseUrl) {
    missing.push("VITE_SUPABASE_URL or SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    missing.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY");
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}.`;
    console.error(message);
    throw new Error(message);
  }

  return {
    url: supabaseUrl!,
    anonKey: supabaseAnonKey!,
  };
};

const nodeEnv =
  env.NODE_ENV ??
  env.MODE ??
  (env.PROD === true ? "production" : env.DEV === true ? "development" : undefined) ??
  "development";

const isProduction = env.PROD ?? nodeEnv === "production";
const isDevelopment = env.DEV ?? !isProduction;

if (nodeEnv !== "test") {
  ensureSupabaseConfig();
}

const config = {
  appName: env.VITE_APP_NAME ?? "CHD QBank",
  nodeEnv,
  isProduction,
  isDevelopment,
  get supabase(): SupabaseConfig {
    return ensureSupabaseConfig();
  },
  get optionalSupabase(): OptionalSupabaseConfig {
    return optionalSupabase;
  },
};

export type { OptionalSupabaseConfig, SupabaseConfig };
export default config;

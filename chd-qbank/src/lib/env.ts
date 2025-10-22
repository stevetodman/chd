import { z } from "zod";

type RawClientEnv = {
  SUPABASE_URL: string | undefined;
  SUPABASE_ANON_KEY: string | undefined;
};

type ClientEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const clientEnvSchema = z.object({
  SUPABASE_URL: z
    .string({ required_error: "SUPABASE_URL is required" })
    .min(1, "SUPABASE_URL is required"),
  SUPABASE_ANON_KEY: z
    .string({ required_error: "SUPABASE_ANON_KEY is required" })
    .min(1, "SUPABASE_ANON_KEY is required")
});

const rawClientEnv: RawClientEnv = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL,
  SUPABASE_ANON_KEY:
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY
};

const clientParseResult = clientEnvSchema.safeParse(rawClientEnv);

const formatIssues = (issues: z.ZodIssue[]) =>
  issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

if (!clientParseResult.success) {
  const message = formatIssues(clientParseResult.error.issues);
  if (import.meta.env.PROD) {
    throw new Error(`Invalid Supabase configuration: ${message}`);
  }
  console.warn(`Invalid Supabase configuration: ${message}`);
}

export const clientEnv: ClientEnv = clientParseResult.success
  ? {
      supabaseUrl: clientParseResult.data.SUPABASE_URL,
      supabaseAnonKey: clientParseResult.data.SUPABASE_ANON_KEY
    }
  : {
      supabaseUrl: "",
      supabaseAnonKey: ""
    };

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

type DenoEnv = { get(key: string): string | undefined };

type ServerEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

const serverEnvSchema = z.object({
  SUPABASE_URL: z
    .string({ required_error: "SUPABASE_URL is required" })
    .min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ required_error: "SUPABASE_SERVICE_ROLE_KEY is required" })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required")
});

const formatIssues = (issues: z.ZodIssue[]) =>
  issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

const denoEnv: DenoEnv | undefined =
  (globalThis as { Deno?: { env: DenoEnv } }).Deno?.env;

if (!denoEnv) {
  throw new Error("serverEnv can only be imported in a Deno runtime");
}

const serverParseResult = serverEnvSchema.safeParse({
  SUPABASE_URL: denoEnv.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: denoEnv.get("SUPABASE_SERVICE_ROLE_KEY")
});

if (!serverParseResult.success) {
  throw new Error(`Invalid Supabase server configuration: ${formatIssues(serverParseResult.error.issues)}`);
}

export const serverEnv: ServerEnv = {
  supabaseUrl: serverParseResult.data.SUPABASE_URL,
  supabaseServiceRoleKey: serverParseResult.data.SUPABASE_SERVICE_ROLE_KEY
};

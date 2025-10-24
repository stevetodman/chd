import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./utils/loadEnv.mjs";

function isTruthy(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && normalized !== "false" && normalized !== "0" && normalized !== "disabled";
  }
  return true;
}

function isPolicyDisabled(policy) {
  if (!policy || typeof policy !== "object") return false;
  if ("is_enabled" in policy) {
    return !isTruthy(policy.is_enabled);
  }
  if ("enabled" in policy) {
    return !isTruthy(policy.enabled);
  }
  return false;
}

function stringifyRoles(roles) {
  if (!roles) return "(no roles)";
  if (Array.isArray(roles)) return roles.length > 0 ? roles.join(", ") : "(no roles)";
  if (typeof roles === "string") return roles || "(no roles)";
  return String(roles);
}

function stringifyAction(policy) {
  if (!policy) return "UNKNOWN";
  return policy.command ?? policy.action ?? policy.cmd ?? "ALL";
}

function stringifyDefinition(policy) {
  if (!policy) return "";
  const using = policy.definition ?? policy.qual ?? policy.using ?? null;
  const check = policy.check ?? policy.with_check ?? null;
  const parts = [];
  if (using) parts.push(`USING: ${using}`);
  if (check) parts.push(`CHECK: ${check}`);
  return parts.length > 0 ? parts.join(" | ") : "";
}

loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("[policies] Skipping verification (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data, error } = await supabase
    .from("pg_policies")
    .select("*")
    .order("schema", { ascending: true })
    .order("table", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[policies] Failed to fetch policies:", error.message ?? error);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.warn("[policies] No policies returned; confirm the service role key has metadata access.");
    process.exitCode = 1;
    return;
  }

  const byTable = new Map();
  for (const policy of data) {
    const schema = policy.schema ?? policy.schemaname ?? "public";
    const table = policy.table ?? policy.tablename ?? "";
    const key = `${schema}.${table}`;
    if (!byTable.has(key)) {
      byTable.set(key, []);
    }
    byTable.get(key).push(policy);
  }

  const disabledPolicies = [];
  console.log("[policies] Policy snapshot:");
  const sortedTables = Array.from(byTable.keys()).sort();
  for (const tableKey of sortedTables) {
    console.log(`  • ${tableKey}`);
    const policies = byTable.get(tableKey) ?? [];
    for (const policy of policies) {
      const status = isPolicyDisabled(policy) ? "DISABLED" : "enabled";
      const name = policy.name ?? policy.policyname ?? "(unnamed)";
      const action = stringifyAction(policy);
      const roles = stringifyRoles(policy.roles ?? policy.policyroles);
      const definition = stringifyDefinition(policy);
      const line = [`    - ${name}`, `action=${action}`, `roles=${roles}`, `status=${status}`];
      if (definition) {
        line.push(definition);
      }
      console.log(line.join(" | "));
      if (status === "DISABLED") {
        disabledPolicies.push({ tableKey, name });
      }
    }
  }

  if (disabledPolicies.length > 0) {
    console.warn(
      "[policies] WARNING: The following policies are disabled:\n" +
        disabledPolicies.map((p) => `  - ${p.tableKey}: ${p.name}`).join("\n")
    );
    process.exitCode = 1;
  } else {
    console.log("[policies] All policies are enabled.");
  }
}

main().catch((error) => {
  console.error("[policies] Unexpected error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

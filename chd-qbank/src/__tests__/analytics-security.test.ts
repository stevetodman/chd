import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaPath = resolve(__dirname, "../../schema.sql");
const schemaSql = readFileSync(schemaPath, "utf8");

function extractFunctionDefinition(name: string): string {
  const pattern = new RegExp(`create\\s+or\\s+replace\\s+function\\s+${name}\\s*\\([\\s\\S]+?\\$\\$;`, "i");
  const match = schemaSql.match(pattern);
  if (!match) {
    throw new Error(`Could not locate definition for ${name}`);
  }
  return match[0];
}

describe("security definer analytics safeguards", () => {
  const leaderboardFn = extractFunctionDefinition("leaderboard_weekly_entries");
  const reliabilityFn = extractFunctionDefinition("refresh_assessment_reliability");

  it("requires leaderboard to be enabled or a privileged caller", () => {
    expect(leaderboardFn).toMatch(/returns\s+table\s*\(\s*user_id\s+uuid,\s*points\s+bigint\s*\)/i);
    expect(leaderboardFn).toMatch(
      /if\s+auth\.role\(\)\s*<>\s*'service_role'\s+and\s+not\s+is_admin\(\)\s+and\s+not\s+leaderboard_is_enabled\(\)\s+then/i
    );
    expect(leaderboardFn).toContain("raise exception 'Leaderboard disabled'");
  });

  it("exposes only aggregate leaderboard columns", () => {
    const [, returnSection = ""] = leaderboardFn.split(/return\s+query/i);
    expect(returnSection).toMatch(/select\s+user_id,\s*sum\(points\)\s+as\s+points/i);
    expect(returnSection).toMatch(/group\s+by\s+user_id/i);
    const [, afterGroupBy = ""] = returnSection.split(/group\s+by\s+user_id/i);
    expect(afterGroupBy).not.toMatch(/\bquestion_id\b/i);
  });

  it("guards reliability refresh behind privileged roles", () => {
    expect(reliabilityFn).toMatch(/returns\s+void/i);
    expect(reliabilityFn).toMatch(
      /if\s+not\s+is_admin\(\)\s+and\s+auth\.role\(\)\s*<>\s*'service_role'\s+then/i
    );
    expect(reliabilityFn).toContain("raise exception 'Admin privileges required'");
  });

  it("only writes aggregated reliability snapshots", () => {
    expect(reliabilityFn).toMatch(
      /insert\s+into\s+assessment_reliability\s*\(\s*id,\s*kr20_alpha,\s*cronbach_alpha,\s*n_items,\s*n_users,\s*total_attempts,\s*score_variance,\s*sum_item_variance,\s*last_computed_at\s*\)/i
    );
    expect(reliabilityFn).not.toMatch(/return\s+query/i);
  });

  it("never grants direct execution on sensitive refresh routines", () => {
    const refreshGrants = [...schemaSql.matchAll(/grant\s+execute\s+on\s+function\s+refresh_assessment_reliability\(\)\s+to\s+([a-z_]+)/gi)];
    expect(refreshGrants).toHaveLength(0);

    const wrapperGrants = [...schemaSql.matchAll(/grant\s+execute\s+on\s+function\s+analytics_refresh_reliability\(\)\s+to\s+([a-z_]+)/gi)];
    const grantedRoles = new Set(wrapperGrants.map(([, role]) => role));
    expect(grantedRoles.has("authenticated")).toBe(true);
    expect(grantedRoles.has("service_role")).toBe(true);
  });

  it("does not expose the weekly entries function directly", () => {
    const weeklyGrants = [...schemaSql.matchAll(/grant\s+execute\s+on\s+function\s+leaderboard_weekly_entries\(\)\s+to\s+([a-z_]+)/gi)];
    expect(weeklyGrants).toHaveLength(0);
  });
});

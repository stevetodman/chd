import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, "utf8");
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith("#")) return;
      const eq = line.indexOf("=");
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
}

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const QUESTION_COUNT = Number(process.env.HEATMAP_VERIFY_QUESTIONS ?? 200);
const USER_COUNT = Number(process.env.HEATMAP_VERIFY_USERS ?? 50);
const BATCH_SIZE = Number(process.env.HEATMAP_VERIFY_BATCH ?? 500);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function ensureAppUsers(userIds) {
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await supabase
      .from("app_users")
      .select("id")
      .in("id", userIds);
    if (error) throw error;
    if ((data ?? []).length === userIds.length) return;
    await sleep(200);
  }
  throw new Error("Timed out waiting for app_users rows to sync");
}

async function createSyntheticUsers(count, tag) {
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const email = `heatmap-${tag}-${i}@example.com`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { synthetic: true, purpose: "heatmap-verification" }
    });
    if (error) {
      throw new Error(`Failed to create synthetic user ${email}: ${error.message}`);
    }
    created.push(data.user.id);
  }
  await ensureAppUsers(created);
  return created;
}

function buildQuestionPayload(count, tag) {
  const createdAt = new Date().toISOString();
  return Array.from({ length: count }, (_, index) => ({
    id: randomUUID(),
    status: "published",
    slug: `heatmap-verification-${tag}-${index}`,
    stem_md: `Synthetic stem ${index}`,
    explanation_brief_md: `Synthetic explanation ${index}`,
    lesion: `Lesion ${index % 5}`,
    topic: `Topic ${index % 5}`,
    created_at: createdAt,
    updated_at: createdAt
  }));
}

function buildResponsePayload(questions, users) {
  const responses = [];
  const baseDate = Date.now();
  for (let qi = 0; qi < questions.length; qi += 1) {
    const q = questions[qi];
    for (let ui = 0; ui < users.length; ui += 1) {
      const createdAt = new Date(
        baseDate - ((qi + ui) % 8) * 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      responses.push({
        id: randomUUID(),
        user_id: users[ui],
        question_id: q.id,
        is_correct: ((qi + ui) % 2) === 0,
        ms_to_answer: 20000 + ((qi * 41 + ui * 17) % 30000),
        created_at: createdAt
      });
    }
  }
  return responses;
}

async function insertInBatches(table, rows, batchSize) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const { error } = await supabase.from(table).insert(batch, { returning: "minimal" });
    if (error) {
      throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }
  }
}

async function deleteByIds(table, column, ids) {
  if (ids.length === 0) return;
  const { error } = await supabase.from(table).delete({ returning: "minimal" }).in(column, ids);
  if (error) {
    throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
}

async function run() {
  const tag = `${Date.now()}`;
  const createdUsers = [];
  const createdQuestions = [];
  try {
    console.log(`Creating ${USER_COUNT} synthetic users…`);
    const userIds = await createSyntheticUsers(USER_COUNT, tag);
    createdUsers.push(...userIds);

    console.log(`Creating ${QUESTION_COUNT} published questions…`);
    const questions = buildQuestionPayload(QUESTION_COUNT, tag);
    await insertInBatches("questions", questions, BATCH_SIZE);
    createdQuestions.push(...questions.map((q) => q.id));

    console.log("Generating response payloads…");
    const responses = buildResponsePayload(questions, userIds);
    console.log(`Inserting ${responses.length} responses in batches of ${BATCH_SIZE}…`);
    await insertInBatches("responses", responses, BATCH_SIZE);

    console.log("Refreshing analytics_heatmap_agg via analytics_refresh_heatmap()…");
    const start = performance.now();
    const { error: refreshError } = await supabase.rpc("analytics_refresh_heatmap");
    if (refreshError) {
      throw new Error(`Failed to refresh heatmap aggregate: ${refreshError.message}`);
    }
    const durationMs = performance.now() - start;
    console.log(`Refresh completed in ${durationMs.toFixed(2)} ms.`);

    console.log("Cleaning up synthetic responses…");
    await deleteByIds("responses", "question_id", createdQuestions);

    console.log("Cleaning up synthetic questions…");
    await deleteByIds("questions", "id", createdQuestions);

    console.log("Triggering final refresh to clear materialized view…");
    const { error: finalRefreshError } = await supabase.rpc("analytics_refresh_heatmap");
    if (finalRefreshError) {
      throw new Error(`Final refresh failed: ${finalRefreshError.message}`);
    }

    console.log("Deleting synthetic users…");
    for (const userId of createdUsers) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        throw new Error(`Failed to delete synthetic user ${userId}: ${error.message}`);
      }
    }

    console.log("Verification complete.");
    console.log(
      JSON.stringify(
        {
          user_count: USER_COUNT,
          question_count: QUESTION_COUNT,
          response_rows: QUESTION_COUNT * USER_COUNT,
          refresh_ms: durationMs
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (createdQuestions.length > 0) {
      try {
        await deleteByIds("responses", "question_id", createdQuestions);
      } catch (cleanupError) {
        console.error(`Cleanup (responses) failed: ${cleanupError.message}`);
      }
      try {
        await deleteByIds("questions", "id", createdQuestions);
      } catch (cleanupError) {
        console.error(`Cleanup (questions) failed: ${cleanupError.message}`);
      }
    }
    if (createdUsers.length > 0) {
      for (const userId of createdUsers) {
        try {
          await supabase.auth.admin.deleteUser(userId);
        } catch (cleanupError) {
          console.error(`Cleanup (user ${userId}) failed: ${cleanupError.message}`);
        }
      }
    }
    try {
      await supabase.rpc("analytics_refresh_heatmap");
    } catch {
      // ignore
    }
  }
}

run();

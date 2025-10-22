import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { questionSeeds, mediaBundleSeeds, cxrItemSeeds } from "./seed/data.js";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, "utf8");
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith("#")) return;
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) return;
      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function verifyCounts() {
  const { count: questionCount, error: questionCountError } = await supabase
    .from("questions")
    .select("*", { head: true, count: "exact" })
    .eq("status", "published");

  if (questionCountError) {
    throw new Error(`Failed to count questions: ${questionCountError.message}`);
  }

  if (typeof questionCount !== "number" || questionCount < 10) {
    throw new Error(
      `Expected at least 10 published questions, found ${questionCount ?? "unknown"}.`
    );
  }

  const { count: mediaCount, error: mediaCountError } = await supabase
    .from("media_bundles")
    .select("*", { head: true, count: "exact" });

  if (mediaCountError) {
    throw new Error(`Failed to count media bundles: ${mediaCountError.message}`);
  }

  if (typeof mediaCount !== "number" || mediaCount < 2) {
    throw new Error(`Expected at least 2 media bundles, found ${mediaCount ?? "unknown"}.`);
  }

  const { count: cxrCount, error: cxrCountError } = await supabase
    .from("cxr_items")
    .select("*", { head: true, count: "exact" })
    .eq("status", "published");

  if (cxrCountError) {
    throw new Error(`Failed to count CXR items: ${cxrCountError.message}`);
  }

  if (typeof cxrCount !== "number" || cxrCount < 1) {
    throw new Error(`Expected at least 1 published CXR item, found ${cxrCount ?? "unknown"}.`);
  }
}

async function verifyQuestions() {
  const slugs = questionSeeds.map((question) => question.slug);
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, slug, correct_choice_id, media_bundle_id, choices:choices(id,label,is_correct)"
    )
    .in("slug", slugs);

  if (error) {
    throw new Error(`Failed to fetch seeded questions: ${error.message}`);
  }

  const rows = data ?? [];

  if (rows.length !== slugs.length) {
    throw new Error(`Expected ${slugs.length} seeded questions, found ${rows.length}.`);
  }

  for (const question of questionSeeds) {
    const row = rows.find((entry) => entry.slug === question.slug);
    if (!row) {
      throw new Error(`Question with slug ${question.slug} is missing.`);
    }

    if (!row.correct_choice_id) {
      throw new Error(`Question ${question.slug} is missing a correct choice.`);
    }

    const matchingChoice = (row.choices ?? []).find(
      (choice) => choice.id === row.correct_choice_id && choice.is_correct
    );

    if (!matchingChoice) {
      throw new Error(
        `Question ${question.slug} has an invalid correct_choice_id reference.`
      );
    }

    const correctCount = (row.choices ?? []).filter((choice) => choice.is_correct).length;
    if (correctCount !== 1) {
      throw new Error(`Question ${question.slug} should have exactly 1 correct choice.`);
    }

    const seedMedia = question.media_bundle_id ?? null;
    if (seedMedia !== (row.media_bundle_id ?? null)) {
      throw new Error(`Question ${question.slug} media bundle mismatch.`);
    }
  }
}

async function verifyMediaBundles() {
  const mediaIds = mediaBundleSeeds.map((bundle) => bundle.id);
  const { data, error } = await supabase
    .from("media_bundles")
    .select("id")
    .in("id", mediaIds);

  if (error) {
    throw new Error(`Failed to fetch media bundles: ${error.message}`);
  }

  const rows = data ?? [];
  if (rows.length !== mediaIds.length) {
    throw new Error(`Expected ${mediaIds.length} media bundles, found ${rows.length}.`);
  }
}

async function verifyCxrContent() {
  const itemIds = cxrItemSeeds.map((item) => item.id);
  const { data: items, error: itemError } = await supabase
    .from("cxr_items")
    .select("id, status")
    .in("id", itemIds);

  if (itemError) {
    throw new Error(`Failed to fetch CXR items: ${itemError.message}`);
  }

  const rows = items ?? [];
  if (rows.length !== itemIds.length) {
    throw new Error(`Expected ${itemIds.length} CXR items, found ${rows.length}.`);
  }

  for (const row of rows) {
    if (row.status !== "published") {
      throw new Error(`CXR item ${row.id} should be published.`);
    }
  }

  const labelIds = cxrItemSeeds.flatMap((item) => item.labels.map((label) => label.id));
  const { data: labels, error: labelError } = await supabase
    .from("cxr_labels")
    .select("id")
    .in("id", labelIds);

  if (labelError) {
    throw new Error(`Failed to fetch CXR labels: ${labelError.message}`);
  }

  if ((labels ?? []).length !== labelIds.length) {
    throw new Error(`Expected ${labelIds.length} CXR labels, found ${(labels ?? []).length}.`);
  }
}

async function main() {
  await verifyCounts();
  await verifyQuestions();
  await verifyMediaBundles();
  await verifyCxrContent();
  console.log("Seed verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

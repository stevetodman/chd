import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mediaBundleSeeds, questionSeeds, cxrItemSeeds } from "./data.js";

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

async function upsertMediaBundles() {
  const { error } = await supabase
    .from("media_bundles")
    .upsert(mediaBundleSeeds, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to upsert media bundles: ${error.message}`);
  }

  console.log(`Upserted ${mediaBundleSeeds.length} media bundles.`);
}

async function upsertQuestions() {
  const questionPayload = questionSeeds.map((question) => ({
    id: question.id,
    slug: question.slug,
    stem_md: question.stem_md,
    lead_in: question.lead_in ?? null,
    explanation_brief_md: question.explanation_brief_md,
    explanation_deep_md: question.explanation_deep_md ?? null,
    difficulty_target: question.difficulty_target,
    bloom: question.bloom,
    topic: question.topic,
    subtopic: question.subtopic,
    lesion: question.lesion,
    lecture_link: question.lecture_link ?? null,
    media_bundle_id: question.media_bundle_id ?? null,
    context_panels: question.context_panels ?? null,
    status: question.status,
    correct_choice_id: null
  }));

  const { error } = await supabase
    .from("questions")
    .upsert(questionPayload, { onConflict: "slug" });

  if (error) {
    throw new Error(`Failed to upsert questions: ${error.message}`);
  }

  console.log(`Upserted ${questionSeeds.length} questions.`);
}

async function upsertChoices() {
  const choicePayload = questionSeeds.flatMap((question) =>
    question.choices.map((choice) => ({
      ...choice,
      question_id: question.id
    }))
  );

  const { error } = await supabase
    .from("choices")
    .upsert(choicePayload, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to upsert choices: ${error.message}`);
  }

  console.log(`Upserted ${choicePayload.length} choices.`);
}

async function updateCorrectChoices() {
  for (const question of questionSeeds) {
    const correctChoice = question.choices.find((choice) => choice.is_correct);
    if (!correctChoice) continue;

    const { error } = await supabase
      .from("questions")
      .update({ correct_choice_id: correctChoice.id })
      .eq("id", question.id);

    if (error) {
      throw new Error(
        `Failed to update correct choice for question ${question.slug}: ${error.message}`
      );
    }
  }

  console.log("Linked correct choices to questions.");
}

async function upsertCxrContent() {
  const cxrPayload = cxrItemSeeds.map((item) => ({
    id: item.id,
    slug: item.slug,
    image_url: item.image_url,
    caption_md: item.caption_md ?? null,
    lesion: item.lesion ?? null,
    topic: item.topic ?? null,
    status: item.status
  }));

  const { error: cxrError } = await supabase
    .from("cxr_items")
    .upsert(cxrPayload, { onConflict: "slug" });

  if (cxrError) {
    throw new Error(`Failed to upsert CXR items: ${cxrError.message}`);
  }

  const labelPayload = cxrItemSeeds.flatMap((item) =>
    item.labels.map((label) => ({
      ...label,
      item_id: item.id
    }))
  );

  const { error: labelError } = await supabase
    .from("cxr_labels")
    .upsert(labelPayload, { onConflict: "id" });

  if (labelError) {
    throw new Error(`Failed to upsert CXR labels: ${labelError.message}`);
  }

  console.log(
    `Upserted ${cxrPayload.length} CXR items with ${labelPayload.length} labels.`
  );
}

async function main() {
  await upsertMediaBundles();
  await upsertQuestions();
  await upsertChoices();
  await updateCorrectChoices();
  await upsertCxrContent();
}

main()
  .then(() => {
    console.log("Full seed completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

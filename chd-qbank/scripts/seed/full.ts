import { createClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";
import { loadEnvFile } from "../utils/loadEnv.js";
import {
  MEDIA_BUNDLES,
  QUESTIONS,
  CXR_ITEMS,
  type MediaBundleSeed,
  type QuestionSeed,
  type CxrItemSeed,
  type QuestionChoiceSeed,
  type CxrLabelSeed
} from "./seedData.js";

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const DEFAULT_ADMIN_ALIAS = process.env.SEED_ADMIN_ALIAS ?? "demo-admin";

function exitOnError(error: PostgrestError | null, message: string): void {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}

async function upsertMediaBundle(bundle: MediaBundleSeed): Promise<void> {
  const { data: existing, error } = await supabase
    .from("media_bundles")
    .select("id")
    .eq("id", bundle.id)
    .maybeSingle();

  exitOnError(error, `Failed to look up media bundle ${bundle.id}`);

  const payload = {
    murmur_url: bundle.murmur_url ?? null,
    cxr_url: bundle.cxr_url ?? null,
    ekg_url: bundle.ekg_url ?? null,
    diagram_url: bundle.diagram_url ?? null,
    alt_text: bundle.alt_text ?? null
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("media_bundles")
      .update(payload)
      .eq("id", bundle.id);
    exitOnError(updateError, `Failed to update media bundle ${bundle.id}`);
  } else {
    const { error: insertError } = await supabase
      .from("media_bundles")
      .insert({ id: bundle.id, ...payload });
    exitOnError(insertError, `Failed to insert media bundle ${bundle.id}`);
  }
}

async function syncQuestionChoices(
  questionId: string,
  choices: QuestionChoiceSeed[],
  questionSlug: string
): Promise<void> {
  const { data: existingChoices, error } = await supabase
    .from("choices")
    .select("id,label")
    .eq("question_id", questionId);
  exitOnError(error, `Failed to load choices for ${questionSlug}`);

  const existingMap = new Map(existingChoices?.map((choice) => [choice.label, choice]) ?? []);
  const desiredLabels = new Set<string>(choices.map((choice) => choice.label));

  for (const choice of choices) {
    const payload = {
      text_md: choice.text_md,
      is_correct: choice.is_correct
    };

    const existingChoice = existingMap.get(choice.label);
    if (existingChoice) {
      const { error: updateError } = await supabase
        .from("choices")
        .update(payload)
        .eq("id", existingChoice.id);
      exitOnError(updateError, `Failed to update choice ${choice.label} for ${questionSlug}`);
    } else {
      const { error: insertError } = await supabase
        .from("choices")
        .insert({ question_id: questionId, label: choice.label, ...payload });
      exitOnError(insertError, `Failed to insert choice ${choice.label} for ${questionSlug}`);
    }
  }

  for (const existing of existingChoices ?? []) {
    if (!desiredLabels.has(existing.label)) {
      const { error: deleteError } = await supabase
        .from("choices")
        .delete()
        .eq("id", existing.id);
      exitOnError(deleteError, `Failed to remove stale choice ${existing.label} for ${questionSlug}`);
    }
  }

  const { data: refreshedChoices, error: refreshError } = await supabase
    .from("choices")
    .select("id,label,is_correct")
    .eq("question_id", questionId);
  exitOnError(refreshError, `Failed to reload choices for ${questionSlug}`);

  const correct = (refreshedChoices ?? []).find((choice) => choice.is_correct);
  if (!correct) {
    throw new Error(`No correct choice defined for question ${questionSlug}`);
  }

  const { error: setCorrectError } = await supabase
    .from("questions")
    .update({ correct_choice_id: correct.id })
    .eq("id", questionId);
  exitOnError(setCorrectError, `Failed to set correct choice for ${questionSlug}`);
}

async function upsertQuestion(question: QuestionSeed): Promise<void> {
  const { data: existing, error } = await supabase
    .from("questions")
    .select("id")
    .eq("slug", question.slug)
    .maybeSingle();
  exitOnError(error, `Failed to look up question ${question.slug}`);

  const payload = {
    stem_md: question.stem_md,
    lead_in: question.lead_in ?? null,
    explanation_brief_md: question.explanation_brief_md,
    explanation_deep_md: question.explanation_deep_md ?? null,
    topic: question.topic ?? null,
    subtopic: question.subtopic ?? null,
    lesion: question.lesion ?? null,
    difficulty_target: question.difficulty_target ?? null,
    bloom: question.bloom ?? null,
    lecture_link: question.lecture_link ?? null,
    media_bundle_id: question.mediaBundleId ?? null,
    status: question.status,
    context_panels: question.context_panels ?? null
  };

  let questionId: string;

  if (existing) {
    const { error: updateError } = await supabase
      .from("questions")
      .update(payload)
      .eq("id", existing.id);
    exitOnError(updateError, `Failed to update question ${question.slug}`);
    questionId = existing.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("questions")
      .insert({ slug: question.slug, ...payload })
      .select("id")
      .single();
    exitOnError(insertError, `Failed to insert question ${question.slug}`);
    const insertedId = inserted?.id;
    if (!insertedId) {
      throw new Error(`Inserted question ${question.slug} did not return an id`);
    }
    questionId = insertedId;
  }

  await syncQuestionChoices(questionId, question.choices, question.slug);
}

async function syncCxrLabels(itemId: string, labels: CxrLabelSeed[], slug: string): Promise<void> {
  const { data: existingLabels, error } = await supabase
    .from("cxr_labels")
    .select("id,label")
    .eq("item_id", itemId);
  exitOnError(error, `Failed to load labels for CXR item ${slug}`);

  const existingMap = new Map(existingLabels?.map((label) => [label.label, label]) ?? []);
  const desiredLabels = new Set<string>(labels.map((label) => label.label));

  for (const label of labels) {
    const payload = {
      x: label.x,
      y: label.y,
      w: label.w,
      h: label.h,
      is_correct: label.is_correct
    };
    const existing = existingMap.get(label.label);
    if (existing) {
      const { error: updateError } = await supabase
        .from("cxr_labels")
        .update(payload)
        .eq("id", existing.id);
      exitOnError(updateError, `Failed to update CXR label ${label.label} for ${slug}`);
    } else {
      const { error: insertError } = await supabase
        .from("cxr_labels")
        .insert({ item_id: itemId, label: label.label, ...payload });
      exitOnError(insertError, `Failed to insert CXR label ${label.label} for ${slug}`);
    }
  }

  for (const existing of existingLabels ?? []) {
    if (!desiredLabels.has(existing.label)) {
      const { error: deleteError } = await supabase
        .from("cxr_labels")
        .delete()
        .eq("id", existing.id);
      exitOnError(deleteError, `Failed to remove stale CXR label ${existing.label} for ${slug}`);
    }
  }
}

async function upsertCxrItem(item: CxrItemSeed): Promise<void> {
  const { data: existing, error } = await supabase
    .from("cxr_items")
    .select("id")
    .eq("slug", item.slug)
    .maybeSingle();
  exitOnError(error, `Failed to look up CXR item ${item.slug}`);

  const payload = {
    image_url: item.image_url,
    caption_md: item.caption_md ?? null,
    lesion: item.lesion ?? null,
    topic: item.topic ?? null,
    status: item.status
  };

  let itemId: string;

  if (existing) {
    const { error: updateError } = await supabase
      .from("cxr_items")
      .update(payload)
      .eq("id", existing.id);
    exitOnError(updateError, `Failed to update CXR item ${item.slug}`);
    itemId = existing.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("cxr_items")
      .insert({ id: item.id, slug: item.slug, ...payload })
      .select("id")
      .single();
    exitOnError(insertError, `Failed to insert CXR item ${item.slug}`);
    const insertedId = inserted?.id;
    if (!insertedId) {
      throw new Error(`Inserted CXR item ${item.slug} did not return an id`);
    }
    itemId = insertedId;
}

  await syncCxrLabels(itemId, item.labels, item.slug);
}

async function ensureDefaultAdmin(): Promise<void> {
  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
    throw new Error("Default admin credentials are not configured.");
  }

  const { data: existingUser, error: lookupError } = await supabase.auth.admin.getUserByEmail(
    DEFAULT_ADMIN_EMAIL
  );
  if (lookupError) {
    throw new Error(`Failed to look up default admin user: ${lookupError.message}`);
  }

  let userId = existingUser.user?.id ?? null;
  let createdUser = false;

  if (!userId) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { seeded_admin: true }
    });

    if (createError) {
      throw new Error(`Failed to create default admin user: ${createError.message}`);
    }

    userId = created.user?.id ?? null;
    if (!userId) {
      throw new Error("Default admin user was created but did not return an id.");
    }

    createdUser = true;
    console.log(`Created default admin account for ${DEFAULT_ADMIN_EMAIL}.`);
  }

  if (!userId) {
    throw new Error("Default admin user id could not be resolved.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("app_users")
    .select("role, alias")
    .eq("id", userId)
    .maybeSingle();
  exitOnError(profileError, `Failed to load app_user profile for ${DEFAULT_ADMIN_EMAIL}`);

  if (!profile) {
    const { error: insertError } = await supabase
      .from("app_users")
      .upsert(
        { id: userId, role: "admin", alias: DEFAULT_ADMIN_ALIAS, alias_locked: false },
        { onConflict: "id" }
      );
    exitOnError(insertError, `Failed to seed admin profile for ${DEFAULT_ADMIN_EMAIL}`);
    return;
  }

  const updates: Record<string, unknown> = {};
  if (profile.role !== "admin") {
    updates.role = "admin";
  }
  if (!profile.alias) {
    updates.alias = DEFAULT_ADMIN_ALIAS;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("app_users")
      .update(updates)
      .eq("id", userId);
    exitOnError(updateError, `Failed to update admin profile for ${DEFAULT_ADMIN_EMAIL}`);
  }

  if (createdUser) {
    console.log(
      `Seeded default admin credentials (email: ${DEFAULT_ADMIN_EMAIL}). Prompt rotation after first login.`
    );
  }
}

async function main(): Promise<void> {
  for (const bundle of MEDIA_BUNDLES) {
    await upsertMediaBundle(bundle);
  }

  for (const question of QUESTIONS) {
    await upsertQuestion(question);
  }

  for (const cxrItem of CXR_ITEMS) {
    await upsertCxrItem(cxrItem);
  }

  await ensureDefaultAdmin();

  console.log("Full seed completed successfully.");
}

main().catch((error) => {
  console.error("Unexpected failure during full seed:", error);
  process.exit(1);
});

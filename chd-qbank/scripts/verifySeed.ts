import { createClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import { loadEnvFile } from './utils/loadEnv.js';
import { MEDIA_BUNDLES, QUESTIONS, CXR_ITEMS } from './seed/seedData.js';

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function fail(message: string, error?: PostgrestError | null): never {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
  throw new Error(message);
}

async function verifyCounts(): Promise<void> {
  const { count: questionCount, error: questionError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true });
  if (questionError) fail('Failed to count questions', questionError);
  if ((questionCount ?? 0) < 10)
    fail(`Expected at least 10 questions, found ${questionCount ?? 0}`);

  const { count: mediaCount, error: mediaError } = await supabase
    .from('media_bundles')
    .select('id', { count: 'exact', head: true });
  if (mediaError) fail('Failed to count media bundles', mediaError);
  if ((mediaCount ?? 0) < 2) fail(`Expected at least 2 media bundles, found ${mediaCount ?? 0}`);

  const { count: cxrCount, error: cxrError } = await supabase
    .from('cxr_items')
    .select('id', { count: 'exact', head: true });
  if (cxrError) fail('Failed to count CXR items', cxrError);
  if ((cxrCount ?? 0) < 1) fail(`Expected at least 1 CXR item, found ${cxrCount ?? 0}`);
}

async function verifyQuestions(): Promise<void> {
  const slugs = QUESTIONS.map((q) => q.slug);
  const { data, error } = await supabase
    .from('questions')
    .select(
      'id,slug,status,media_bundle_id,correct_choice_id,context_panels,choices(id,label,is_correct)',
    )
    .in('slug', slugs);
  if (error) fail('Failed to load seeded questions', error);

  if (!data || data.length !== QUESTIONS.length) {
    fail(`Expected ${QUESTIONS.length} seeded questions, found ${data?.length ?? 0}`);
  }

  for (const seed of QUESTIONS) {
    const row = data.find((q) => q.slug === seed.slug);
    if (!row) fail(`Missing seeded question ${seed.slug}`);

    if (row.status !== seed.status) {
      fail(`Question ${seed.slug} has status ${row.status}, expected ${seed.status}`);
    }

    if ((seed.mediaBundleId ?? null) !== (row.media_bundle_id ?? null)) {
      fail(`Question ${seed.slug} media bundle mismatch.`);
    }

    if (seed.context_panels && seed.context_panels.length > 0) {
      if (
        !row.context_panels ||
        !Array.isArray(row.context_panels) ||
        row.context_panels.length === 0
      ) {
        fail(`Question ${seed.slug} missing context panels.`);
      }
    }

    if (!row.choices || row.choices.length !== seed.choices.length) {
      fail(
        `Question ${seed.slug} has ${row.choices?.length ?? 0} choices; expected ${seed.choices.length}.`,
      );
    }

    const correct = row.choices.find((choice: { is_correct: boolean }) => choice.is_correct);
    if (!correct) {
      fail(`Question ${seed.slug} missing correct choice flag.`);
    }

    if (row.correct_choice_id !== correct.id) {
      fail(`Question ${seed.slug} correct_choice_id does not match flagged choice.`);
    }
  }
}

async function verifyMediaBundles(): Promise<void> {
  const ids = MEDIA_BUNDLES.map((bundle) => bundle.id);
  const { data, error } = await supabase
    .from('media_bundles')
    .select('id,murmur_url,cxr_url,diagram_url,alt_text')
    .in('id', ids);
  if (error) fail('Failed to fetch media bundles', error);
  if (!data || data.length !== MEDIA_BUNDLES.length) {
    fail(`Expected ${MEDIA_BUNDLES.length} media bundles, found ${data?.length ?? 0}`);
  }
}

async function verifyCxrItems(): Promise<void> {
  const slugs = CXR_ITEMS.map((item) => item.slug);
  const { data, error } = await supabase
    .from('cxr_items')
    .select('id,slug,status,labels(id,label,is_correct)')
    .in('slug', slugs);
  if (error) fail('Failed to fetch CXR items', error);
  if (!data || data.length !== CXR_ITEMS.length) {
    fail(`Expected ${CXR_ITEMS.length} CXR items, found ${data?.length ?? 0}`);
  }

  for (const seed of CXR_ITEMS) {
    const row = data.find((item) => item.slug === seed.slug);
    if (!row) fail(`Missing CXR item ${seed.slug}`);
    if (row.status !== seed.status) {
      fail(`CXR item ${seed.slug} status mismatch.`);
    }

    if (!row.labels || row.labels.length !== seed.labels.length) {
      fail(`CXR item ${seed.slug} label count mismatch.`);
    }

    const correct = row.labels.find((label: { is_correct: boolean }) => label.is_correct);
    if (!correct) {
      fail(`CXR item ${seed.slug} missing correct label.`);
    }
  }
}

async function main(): Promise<void> {
  await verifyCounts();
  await verifyQuestions();
  await verifyMediaBundles();
  await verifyCxrItems();
  console.log('Seed verification passed: counts and relationships are consistent.');
}

main().catch((error) => {
  console.error('Unexpected verification failure:', error);
  process.exit(1);
});

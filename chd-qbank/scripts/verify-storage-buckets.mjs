import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import bucketConfig from '../src/config/storageBuckets.json' assert { type: 'json' };

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, 'utf8');
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith('#')) return;
      const eq = line.indexOf('=');
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

loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    '[storage] Skipping bucket verification (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).',
  );
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyBuckets() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('[storage] Failed to list buckets', error);
      process.exitCode = 1;
      return;
    }

    const bucketMap = new Map((buckets ?? []).map((bucket) => [bucket.name, bucket]));
    const issues = [];

    for (const expected of bucketConfig) {
      const bucket = bucketMap.get(expected.name);

      if (!bucket) {
        issues.push(`Missing bucket "${expected.name}"`);
        continue;
      }

      if (bucket.public !== expected.public) {
        issues.push(
          `Bucket "${expected.name}" should be ${expected.public ? 'public' : 'private'} but is ${
            bucket.public ? 'public' : 'private'
          }`,
        );
      }
    }

    if (issues.length > 0) {
      console.error(
        ['[storage] Configuration drift detected:', ...issues.map((issue) => `- ${issue}`)].join(
          '\n',
        ),
      );
      process.exitCode = 1;
      return;
    }

    console.log('[storage] Bucket configuration matches expectations.');
  } catch (error) {
    console.error('[storage] Unexpected error verifying bucket configuration', error);
    process.exitCode = 1;
  }
}

await verifyBuckets();

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INVITE_CODE = process.env.INVITE_CODE;
const INVITE_EXPIRES = process.env.INVITE_EXPIRES;

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL environment variable.');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

if (!INVITE_CODE) {
  console.error('Missing INVITE_CODE environment variable.');
  process.exit(1);
}

if (!INVITE_EXPIRES) {
  console.error('Missing INVITE_EXPIRES environment variable.');
  process.exit(1);
}

const expiresDate = new Date(INVITE_EXPIRES);
if (Number.isNaN(expiresDate.getTime())) {
  console.error('INVITE_EXPIRES must be a valid date string (e.g. 2025-11-30).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seedInviteSettings() {
  const payload = [
    { key: 'invite_code', value: INVITE_CODE },
    { key: 'invite_expires', value: expiresDate.toISOString().slice(0, 10) }
  ];

  const { error } = await supabase
    .from('app_settings')
    .upsert(payload, { onConflict: 'key' });

  if (error) {
    console.error('Failed to seed invite settings:', error.message);
    process.exit(1);
  }

  console.log('Invite settings updated successfully.');
}

seedInviteSettings();

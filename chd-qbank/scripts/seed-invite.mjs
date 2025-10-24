import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './utils/loadEnv.mjs';

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INVITE_CODE = process.env.INVITE_CODE;
const INVITE_EXPIRES = process.env.INVITE_EXPIRES;
const INVITE_CODE_SALT = process.env.INVITE_CODE_SALT;

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

function hashInviteCode(code, salt) {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

async function seedInviteSettings() {
  const salt = INVITE_CODE_SALT ?? randomBytes(16).toString('hex');
  const digest = hashInviteCode(INVITE_CODE, salt);

  const payload = [
    { key: 'invite_code_hash', value: digest },
    { key: 'invite_code_salt', value: salt },
    { key: 'invite_expires', value: expiresDate.toISOString().slice(0, 10) }
  ];

  const withTimeout = (promise, ms = 15000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);

  const { error: cleanupError } = await withTimeout(
    supabase.from('app_settings').delete().eq('key', 'invite_code')
  );

  if (cleanupError && cleanupError.code !== 'PGRST116') {
    console.error('Failed to remove legacy invite code:', cleanupError.message);
    process.exit(1);
  }

  const { error } = await withTimeout(
    supabase.from('app_settings').upsert(payload, { onConflict: 'key' })
  );

  if (error) {
    console.error('Failed to seed invite settings:', error.message);
    process.exit(1);
  }

  console.log('Invite settings updated successfully.');
}

seedInviteSettings();

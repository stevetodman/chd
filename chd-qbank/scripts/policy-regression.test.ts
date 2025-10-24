import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf-8');

const requiredRlsTables = [
  'app_users',
  'app_settings',
  'media_bundles',
  'questions',
  'choices',
  'responses',
  'item_stats',
  'distractor_stats',
  'leaderboard',
  'public_aliases',
  'murmur_items',
  'murmur_options',
  'murmur_attempts',
  'cxr_items',
  'cxr_labels',
  'cxr_attempts',
  'leaderboard_events'
] as const;

describe('Supabase row level security coverage', () => {
  for (const table of requiredRlsTables) {
    it(`${table} has RLS enabled`, () => {
      const enableRlsPattern = new RegExp(
        `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security;`,
        'i'
      );
      expect(schemaSql).toMatch(enableRlsPattern);
    });

    it(`${table} has at least one policy`, () => {
      const policyPattern = new RegExp(
        `create\\s+policy\\s+[^;]+\\s+on\\s+${table}\\b`,
        'i'
      );
      expect(schemaSql).toMatch(policyPattern);
    });
  }
});

describe('Admin helper coverage', () => {
  it('retains the is_admin helper for policy enforcement', () => {
    const isAdminPattern = /create\s+or\s+replace\s+function\s+is_admin\s*\(\)\s+returns\s+boolean/i;
    expect(schemaSql).toMatch(isAdminPattern);
  });
});

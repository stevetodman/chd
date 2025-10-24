#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function loadExpectedTables() {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const schemaPath = resolve(thisDir, '..', 'chd-qbank', 'schema.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');
  const regex = /alter\s+table\s+([\w.]+)\s+enable\s+row\s+level\s+security/gi;
  const tables = new Set();
  let match;
  while ((match = regex.exec(schemaSql)) !== null) {
    const rawName = match[1];
    const parts = rawName.split('.');
    const schema = parts.length === 2 ? parts[0] : 'public';
    const table = parts.length === 2 ? parts[1] : parts[0];
    if (schema === 'public') {
      tables.add(table);
    }
  }
  return Array.from(tables).sort();
}

async function fetchRlsStates(client, tables) {
  const { data, error } = await client
    .schema('pg_catalog')
    .from('pg_tables')
    .select('schemaname,tablename,rowsecurity');

  if (error) {
    throw new Error(`Failed to read pg_tables metadata: ${error.message}`);
  }

  const lookup = new Map();
  for (const row of data) {
    if (row.schemaname === 'public') {
      lookup.set(row.tablename, row.rowsecurity === true);
    }
  }

  return tables.map((table) => ({
    table,
    hasRls: lookup.get(table) === true,
    seen: lookup.has(table),
  }));
}

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const expectedTables = await loadExpectedTables();
  if (expectedTables.length === 0) {
    throw new Error('No tables with row-level security were found in schema.sql');
  }

  const client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'verify-policies-script',
      },
    },
  });

  const statuses = await fetchRlsStates(client, expectedTables);
  const missing = statuses.filter((status) => !status.seen);
  const disabled = statuses.filter((status) => status.seen && !status.hasRls);

  if (missing.length > 0 || disabled.length > 0) {
    const problems = [];
    if (missing.length > 0) {
      problems.push(
        `Missing tables in database metadata: ${missing.map((s) => s.table).join(', ')}`,
      );
    }
    if (disabled.length > 0) {
      problems.push(
        `RLS disabled for tables: ${disabled.map((s) => s.table).join(', ')}`,
      );
    }
    throw new Error(problems.join('\n'));
  }

  console.log(`Verified row-level security is enabled for tables: ${expectedTables.join(', ')}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});

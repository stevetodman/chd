import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
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

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = Number(process.env.HEATMAP_VERIFY_RETRY_BASE_MS ?? 250);
const BATCH_CONCURRENCY = Math.max(1, Number(process.env.HEATMAP_VERIFY_CONCURRENCY ?? 1));

function isLocalHost(hostname) {
  if (!hostname) return false;
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized.startsWith('127.') ||
    normalized.endsWith('.local')
  );
}

function parseHostList(value) {
  return value
    ?.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function matchesHostPattern(hostname, patterns) {
  if (!hostname || !patterns?.length) return false;
  const normalized = hostname.toLowerCase();
  return patterns.some((pattern) => {
    if (!pattern) return false;
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
      try {
        const regex = new RegExp(pattern.slice(1, -1));
        return regex.test(normalized);
      } catch {
        return false;
      }
    }
    return normalized === pattern || normalized.endsWith(pattern);
  });
}

function looksLikeProductionSupabase(url) {
  try {
    const { hostname } = new URL(url);
    if (isLocalHost(hostname)) {
      return false;
    }
    const safeHosts = parseHostList(process.env.HEATMAP_VERIFY_NON_PROD_HOSTS);
    if (matchesHostPattern(hostname, safeHosts)) {
      return false;
    }
    const prodHosts = parseHostList(process.env.HEATMAP_VERIFY_PROD_HOSTS);
    if (prodHosts?.length) {
      return matchesHostPattern(hostname, prodHosts);
    }
    return true;
  } catch {
    return false;
  }
}

function getErrorStatus(error) {
  if (!error || typeof error !== 'object') return undefined;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.status === 'string') {
    const parsed = Number(error.status);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof error.code === 'number') return error.code;
  if (typeof error.code === 'string') {
    const parsed = Number(error.code);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (error?.response?.status) return error.response.status;
  if (error?.cause?.status) return error.cause.status;
  return undefined;
}

function parseRetryAfterMs(error) {
  const headerSource =
    error?.response?.headers ??
    error?.headers ??
    error?.cause?.response?.headers ??
    error?.cause?.headers;
  let header;
  if (headerSource?.get instanceof Function) {
    header = headerSource.get('retry-after') ?? headerSource.get('Retry-After');
  } else if (headerSource) {
    header = headerSource['retry-after'] ?? headerSource['Retry-After'];
  }

  if (header) {
    const numeric = Number(header);
    if (!Number.isNaN(numeric) && numeric >= 0) {
      return numeric * 1000;
    }
    const parsedDate = Date.parse(header);
    if (!Number.isNaN(parsedDate)) {
      return Math.max(0, parsedDate - Date.now());
    }
  }

  const message = (typeof error?.message === 'string' && error.message.toLowerCase()) || undefined;
  if (message?.includes('retry')) {
    const match = message.match(/retry(?:-?after)?\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const seconds = Number(match[1]);
      if (!Number.isNaN(seconds)) {
        return seconds * 1000;
      }
    }
  }

  return undefined;
}

function defaultShouldRetry(error) {
  const status = getErrorStatus(error);
  if (status === 429) return true;
  if (status === 408 || status === 425) return true;
  if (status === 0) return true;
  if (typeof error?.name === 'string' && error.name.toLowerCase().includes('retry')) {
    return true;
  }
  if (status === undefined) return true;
  return status >= 500;
}

async function withRetry(operation, description, options = {}) {
  const maxAttempts = options.maxAttempts ?? MAX_RETRY_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? BASE_RETRY_DELAY_MS;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retryable = shouldRetry(error);
      if (!retryable || attempt === maxAttempts) {
        break;
      }
      const retryAfterMs = parseRetryAfterMs(error);
      const delayMs = retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1);
      const status = getErrorStatus(error);
      const message = error instanceof Error ? error.message : String(error);
      const statusText = status ? ` (status ${status})` : '';
      console.warn(
        `Attempt ${attempt} for ${description} failed${statusText}: ${message}. Retrying in ${Math.round(
          delayMs,
        )} ms…`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error(`Operation ${description} failed.`);
}

async function runWithConcurrencyLimit(tasks, limit) {
  if (limit <= 1) {
    for (const task of tasks) {
      // eslint-disable-next-line no-await-in-loop
      await task();
    }
    return;
  }

  const executing = new Set();
  for (const task of tasks) {
    const promise = Promise.resolve().then(task);
    executing.add(promise);
    promise.finally(() => {
      executing.delete(promise);
    });
    if (executing.size >= limit) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL environment variable.');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const QUESTION_COUNT = Number(process.env.HEATMAP_VERIFY_QUESTIONS ?? 200);
const USER_COUNT = Number(process.env.HEATMAP_VERIFY_USERS ?? 50);
const BATCH_SIZE = Number(process.env.HEATMAP_VERIFY_BATCH ?? 500);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const isProductionSupabase = looksLikeProductionSupabase(SUPABASE_URL);

if (!isDryRun && isProductionSupabase && process.env.HEATMAP_VERIFY_ALLOW_PROD !== 'true') {
  console.error(
    `Refusing to run heatmap verification against ${SUPABASE_URL} without HEATMAP_VERIFY_ALLOW_PROD=true. ` +
      'This safeguard prevents accidental execution on production.',
  );
  process.exit(1);
}

if (isDryRun) {
  const responseCount = QUESTION_COUNT * USER_COUNT;
  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        users: USER_COUNT,
        questions: QUESTION_COUNT,
        responses: responseCount,
        batch_size: BATCH_SIZE,
        batch_concurrency: BATCH_CONCURRENCY,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

async function ensureAppUsers(userIds) {
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase.from('app_users').select('id').in('id', userIds);
      if (error) throw error;
      return rows ?? [];
    }, 'select synthetic app_users');
    if (data.length === userIds.length) return;
    await sleep(200);
  }
  throw new Error('Timed out waiting for app_users rows to sync');
}

async function createSyntheticUsers(count, tag) {
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const email = `heatmap-${tag}-${i}@example.com`;
    const data = await withRetry(async () => {
      const { data: createdUser, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { synthetic: true, purpose: 'heatmap-verification' },
      });
      if (error) throw error;
      return createdUser;
    }, `create synthetic user ${email}`);
    created.push(data.user.id);
  }
  await ensureAppUsers(created);
  return created;
}

function buildQuestionPayload(count, tag) {
  const createdAt = new Date().toISOString();
  return Array.from({ length: count }, (_, index) => ({
    id: randomUUID(),
    status: 'published',
    slug: `heatmap-verification-${tag}-${index}`,
    stem_md: `Synthetic stem ${index}`,
    explanation_brief_md: `Synthetic explanation ${index}`,
    lesion: `Lesion ${index % 5}`,
    topic: `Topic ${index % 5}`,
    created_at: createdAt,
    updated_at: createdAt,
  }));
}

function buildResponsePayload(questions, users) {
  const responses = [];
  const baseDate = Date.now();
  for (let qi = 0; qi < questions.length; qi += 1) {
    const q = questions[qi];
    for (let ui = 0; ui < users.length; ui += 1) {
      const createdAt = new Date(
        baseDate - ((qi + ui) % 8) * 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      responses.push({
        id: randomUUID(),
        user_id: users[ui],
        question_id: q.id,
        is_correct: (qi + ui) % 2 === 0,
        ms_to_answer: 20000 + ((qi * 41 + ui * 17) % 30000),
        created_at: createdAt,
      });
    }
  }
  return responses;
}

async function insertInBatches(table, rows, batchSize) {
  const tasks = [];
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    tasks.push(async () => {
      await withRetry(async () => {
        const { error } = await supabase.from(table).insert(batch, { returning: 'minimal' });
        if (error) throw error;
      }, `insert ${table} batch starting at offset ${offset}`);
    });
  }
  await runWithConcurrencyLimit(tasks, BATCH_CONCURRENCY);
}

async function deleteByIds(table, column, ids) {
  if (ids.length === 0) return;
  await withRetry(async () => {
    const { error } = await supabase.from(table).delete({ returning: 'minimal' }).in(column, ids);
    if (error) throw error;
  }, `delete rows from ${table}`);
}

async function callRpcWithRetry(functionName, args = {}, description = functionName) {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc(functionName, args);
    if (error) throw error;
    return data;
  }, `call ${description}`);
}

async function collectSyntheticAuthUsers(emailPrefix) {
  const matches = [];
  const perPage = 200;
  for (let page = 1; page < 1000; page += 1) {
    const data = await withRetry(async () => {
      const { data: result, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      return result;
    }, `list auth users page ${page}`);
    const users = data?.users ?? [];
    matches.push(
      ...users.filter((user) => {
        if (!user?.email) return false;
        if (!user.email.toLowerCase().startsWith(emailPrefix.toLowerCase())) return false;
        const metadata = user.user_metadata ?? {};
        return metadata.synthetic === true && metadata.purpose === 'heatmap-verification';
      }),
    );
    if (!users.length || users.length < perPage) {
      break;
    }
  }
  return matches;
}

async function deleteAuthUsers(userIds) {
  for (const userId of userIds) {
    await withRetry(async () => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    }, `delete synthetic auth user ${userId}`);
  }
}

async function auditSyntheticArtifacts(tag) {
  const slugPrefix = `heatmap-verification-${tag}`;
  const emailPrefix = `heatmap-${tag}-`;

  let outstandingQuestions = [];
  const questionIdSet = new Set();
  try {
    outstandingQuestions =
      (await withRetry(async () => {
        const { data, error } = await supabase
          .from('questions')
          .select('id,slug')
          .like('slug', `${slugPrefix}%`);
        if (error) throw error;
        return data ?? [];
      }, 'audit synthetic questions')) ?? [];
    for (const question of outstandingQuestions) {
      questionIdSet.add(question.id);
    }
  } catch (error) {
    console.error(`Audit failed to query synthetic questions: ${error.message ?? error}`);
    process.exitCode = 1;
    return;
  }

  if (outstandingQuestions.length) {
    console.warn(
      `Audit found ${outstandingQuestions.length} synthetic questions lingering. Attempting cleanup…`,
    );
    try {
      await deleteByIds(
        'questions',
        'id',
        outstandingQuestions.map((q) => q.id),
      );
    } catch (error) {
      console.error(`Audit failed to delete lingering questions: ${error.message ?? error}`);
    }
    outstandingQuestions =
      (await withRetry(async () => {
        const { data, error } = await supabase
          .from('questions')
          .select('id,slug')
          .like('slug', `${slugPrefix}%`);
        if (error) throw error;
        return data ?? [];
      }, 'confirm synthetic questions cleanup')) ?? [];
    for (const question of outstandingQuestions) {
      questionIdSet.add(question.id);
    }
  }

  let outstandingResponses = [];
  try {
    const questionIds = [...questionIdSet];
    outstandingResponses =
      questionIds.length === 0
        ? []
        : ((await withRetry(async () => {
            const { data, error } = await supabase
              .from('responses')
              .select('id')
              .in('question_id', questionIds);
            if (error) throw error;
            return data ?? [];
          }, 'audit synthetic responses')) ?? []);
  } catch (error) {
    console.error(`Audit failed to query synthetic responses: ${error.message ?? error}`);
    process.exitCode = 1;
    return;
  }

  if (outstandingResponses.length) {
    console.warn(
      `Audit found ${outstandingResponses.length} synthetic responses lingering. Attempting cleanup…`,
    );
    try {
      await deleteByIds(
        'responses',
        'id',
        outstandingResponses.map((response) => response.id),
      );
    } catch (error) {
      console.error(`Audit failed to delete lingering responses: ${error.message ?? error}`);
    }
    const questionIds = [...questionIdSet];
    outstandingResponses =
      questionIds.length === 0
        ? []
        : ((await withRetry(async () => {
            const { data, error } = await supabase
              .from('responses')
              .select('id')
              .in('question_id', questionIds);
            if (error) throw error;
            return data ?? [];
          }, 'confirm synthetic responses cleanup')) ?? []);
  }

  let lingeringUsers = [];
  try {
    lingeringUsers = await collectSyntheticAuthUsers(emailPrefix);
  } catch (error) {
    console.error(`Audit failed to enumerate synthetic users: ${error.message ?? error}`);
    process.exitCode = 1;
    return;
  }

  if (lingeringUsers.length) {
    console.warn(
      `Audit found ${lingeringUsers.length} synthetic auth users lingering. Attempting cleanup…`,
    );
    try {
      await deleteAuthUsers(lingeringUsers.map((user) => user.id));
    } catch (error) {
      console.error(`Audit failed to delete lingering auth users: ${error.message ?? error}`);
    }
    lingeringUsers = await collectSyntheticAuthUsers(emailPrefix);
  }

  const hasLeftovers =
    outstandingQuestions.length > 0 || outstandingResponses.length > 0 || lingeringUsers.length > 0;

  if (hasLeftovers) {
    console.error(
      `Audit detected synthetic leftovers after cleanup: ${outstandingQuestions.length} questions, ${outstandingResponses.length} responses, ${lingeringUsers.length} users.`,
    );
    process.exitCode = 1;
  } else {
    console.log('[audit] Synthetic cleanup verified.');
  }
}

async function run() {
  const tag = `${Date.now()}`;
  const createdUsers = [];
  const createdQuestions = [];
  let refreshDurationMs = null;
  try {
    console.log(`Creating ${USER_COUNT} synthetic users…`);
    const userIds = await createSyntheticUsers(USER_COUNT, tag);
    createdUsers.push(...userIds);

    console.log(`Creating ${QUESTION_COUNT} published questions…`);
    const questions = buildQuestionPayload(QUESTION_COUNT, tag);
    await insertInBatches('questions', questions, BATCH_SIZE);
    createdQuestions.push(...questions.map((q) => q.id));

    console.log('Generating response payloads…');
    const responses = buildResponsePayload(questions, userIds);
    console.log(`Inserting ${responses.length} responses in batches of ${BATCH_SIZE}…`);
    await insertInBatches('responses', responses, BATCH_SIZE);

    console.log('Refreshing analytics_heatmap_agg via analytics_refresh_heatmap()…');
    const start = performance.now();
    await callRpcWithRetry('analytics_refresh_heatmap', {}, 'analytics_refresh_heatmap');
    refreshDurationMs = performance.now() - start;
    console.log(`Refresh completed in ${refreshDurationMs.toFixed(2)} ms.`);

    console.log('Cleaning up synthetic responses…');
    await deleteByIds('responses', 'question_id', createdQuestions);

    console.log('Cleaning up synthetic questions…');
    await deleteByIds('questions', 'id', createdQuestions);

    console.log('Triggering final refresh to clear materialized view…');
    await callRpcWithRetry('analytics_refresh_heatmap', {}, 'final analytics_refresh_heatmap');

    console.log('Deleting synthetic users…');
    for (const userId of createdUsers) {
      await withRetry(async () => {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
      }, `delete synthetic user ${userId}`);
    }

    console.log('Verification complete.');
    console.log(
      JSON.stringify(
        {
          user_count: USER_COUNT,
          question_count: QUESTION_COUNT,
          response_rows: QUESTION_COUNT * USER_COUNT,
          refresh_ms: refreshDurationMs,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (createdQuestions.length > 0) {
      try {
        await deleteByIds('responses', 'question_id', createdQuestions);
      } catch (cleanupError) {
        const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        console.error(`Cleanup (responses) failed: ${message}`);
      }
      try {
        await deleteByIds('questions', 'id', createdQuestions);
      } catch (cleanupError) {
        const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        console.error(`Cleanup (questions) failed: ${message}`);
      }
    }
    if (createdUsers.length > 0) {
      for (const userId of createdUsers) {
        try {
          await withRetry(async () => {
            const { error } = await supabase.auth.admin.deleteUser(userId);
            if (error) throw error;
          }, `cleanup delete synthetic user ${userId}`);
        } catch (cleanupError) {
          const message =
            cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
          console.error(`Cleanup (user ${userId}) failed: ${message}`);
        }
      }
    }
    try {
      await callRpcWithRetry('analytics_refresh_heatmap', {}, 'cleanup analytics_refresh_heatmap');
    } catch (cleanupError) {
      const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.error(`Cleanup (final refresh) failed: ${message}`);
    }

    try {
      await auditSyntheticArtifacts(tag);
    } catch (auditError) {
      const message = auditError instanceof Error ? auditError.message : String(auditError);
      console.error(`Final audit failed: ${message}`);
      process.exitCode = 1;
    }
  }
}

run();

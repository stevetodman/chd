import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnvFile } from './utils/loadEnv.js';

interface CliOptions {
  outputPath: string | null;
  status: StatusFilter;
}

type StatusFilter = 'published' | 'draft' | 'archived' | 'all';

type QuestionRecord = Record<string, any>;

type CoverageRow = {
  learningObjective: string;
  bloom: string;
  topic: string;
  count: number;
};

const CSV_HEADER = 'learning_objective,bloom,topic,count\n';
const DEFAULT_STATUS: StatusFilter = 'published';
const PAGE_SIZE = 1000;

function parseArgs(argv: string[]): CliOptions {
  let outputPath: string | null = null;
  let status: StatusFilter = DEFAULT_STATUS;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--output=')) {
      const value = arg.slice('--output='.length).trim();
      if (!value) {
        throw new Error('--output requires a file path');
      }
      outputPath = path.resolve(process.cwd(), value);
    } else if (arg.startsWith('--status=')) {
      const value = arg.slice('--status='.length).trim().toLowerCase();
      if (value === 'all' || value === 'published' || value === 'draft' || value === 'archived') {
        status = value as StatusFilter;
      } else {
        throw new Error(`Unknown status filter: ${value}`);
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { outputPath, status };
}

function printUsage(): void {
  console.log(
    `Usage: npm run blueprint:coverage [-- --status=<published|draft|archived|all>] [--output=<file.csv>]\n\n` +
      `By default, the script connects to Supabase using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment.\n` +
      `If those variables are absent or the request fails, it falls back to reading JSON items under content/questions.\n` +
      `The resulting CSV is printed to stdout unless --output is supplied.`,
  );
}

async function loadLocalQuestions(status: StatusFilter): Promise<QuestionRecord[]> {
  const repoRoot = process.cwd();
  const contentDir = path.join(repoRoot, 'chd-qbank', 'content', 'questions');

  try {
    await fs.access(contentDir);
  } catch (error) {
    return [];
  }

  const entries = await fs.readdir(contentDir);
  const records: QuestionRecord[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const fullPath = path.join(contentDir, entry);
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (status !== 'all') {
        const itemStatus = typeof parsed.status === 'string' ? parsed.status.toLowerCase() : null;
        if (itemStatus && itemStatus !== status) {
          continue;
        }
      }
      records.push(parsed);
    } catch (error) {
      console.error(`Failed to parse ${fullPath}:`, error);
    }
  }

  return records;
}

function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadSupabaseQuestions(
  client: SupabaseClient,
  status: StatusFilter,
): Promise<QuestionRecord[]> {
  const rows: QuestionRecord[] = [];
  let from = 0;

  while (true) {
    let query = client
      .from('questions')
      .select('*', { count: 'exact' })
      .order('slug', { ascending: true, nullsFirst: false });
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Failed to fetch questions from Supabase: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
}

function collectObjectiveCandidates(value: unknown, results: Set<string>): void {
  if (!value) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) results.add(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectObjectiveCandidates(entry, results);
    }
    return;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const preferredKeys = ['code', 'slug', 'id', 'name', 'title', 'label', 'value', 'text'];
    for (const key of preferredKeys) {
      if (key in obj) collectObjectiveCandidates(obj[key], results);
    }
    for (const key of Object.keys(obj)) {
      if (!preferredKeys.includes(key)) collectObjectiveCandidates(obj[key], results);
    }
  }
}

function extractLearningObjectives(record: QuestionRecord): string[] {
  const results = new Set<string>();

  const explicitSources = [
    record.learningObjectives,
    record.learning_objectives,
    record.learningObjective,
    record.learning_objective,
    record.objectives,
    record.objective,
    record.metadata?.learningObjectives,
    record.metadata?.learning_objectives,
    record.metadata?.learningObjective,
    record.metadata?.learning_objective,
  ];

  for (const source of explicitSources) {
    collectObjectiveCandidates(source, results);
  }

  if (results.size === 0) {
    collectObjectiveCandidates(record.lecture_link ?? record.lectureLink, results);
  }

  if (results.size === 0) {
    results.add('Unspecified');
  }

  return Array.from(results);
}

function extractBloom(record: QuestionRecord): string {
  const candidates = [
    record.bloom,
    record.bloomLevel,
    record.bloom_level,
    record.metadata?.bloom,
    record.metadata?.bloomLevel,
    record.metadata?.bloom_level,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return 'Unspecified';
}

function extractTopic(record: QuestionRecord): string {
  const candidates = [
    record.topic,
    record.topic_slug,
    record.topicSlug,
    record.metadata?.topic,
    record.metadata?.topicSlug,
    record.metadata?.topic_slug,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (Array.isArray(record.topics)) {
    for (const topic of record.topics) {
      if (typeof topic === 'string' && topic.trim()) {
        return topic.trim();
      }
    }
  }

  if (Array.isArray(record.tags)) {
    for (const tag of record.tags) {
      if (typeof tag === 'string' && tag.trim()) {
        return tag.trim();
      }
    }
  }

  return 'Unspecified';
}

function computeCoverage(records: QuestionRecord[]): CoverageRow[] {
  const groups = new Map<string, CoverageRow>();

  for (const record of records) {
    const objectives = extractLearningObjectives(record);
    const bloom = normalizeString(extractBloom(record), 'Unspecified');
    const topic = normalizeString(extractTopic(record), 'Unspecified');

    const uniqueObjectives = new Set(
      objectives.map((objective) => normalizeString(objective, 'Unspecified')),
    );

    for (const objective of uniqueObjectives) {
      const key = `${objective}|||${bloom}|||${topic}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, { learningObjective: objective, bloom, topic, count: 1 });
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    return (
      a.learningObjective.localeCompare(b.learningObjective) ||
      a.bloom.localeCompare(b.bloom) ||
      a.topic.localeCompare(b.topic)
    );
  });
}

function toCsv(rows: CoverageRow[]): string {
  const lines = rows.map((row) =>
    [row.learningObjective, row.bloom, row.topic, String(row.count)].map(csvEscape).join(','),
  );
  return CSV_HEADER + lines.join('\n') + (lines.length > 0 ? '\n' : '');
}

function csvEscape(value: string): string {
  const needsQuotes =
    value.includes(',') ||
    value.includes('\n') ||
    value.includes('"') ||
    value.startsWith(' ') ||
    value.endsWith(' ');
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

async function writeOutput(csv: string, outputPath: string | null): Promise<void> {
  if (!outputPath) {
    process.stdout.write(csv);
    return;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, csv, 'utf8');
  console.log(`Blueprint coverage written to ${outputPath}`);
}

async function main(): Promise<void> {
  loadEnvFile();

  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    printUsage();
    process.exit(1);
    return;
  }

  const supabaseClient = createSupabaseClient();
  let records: QuestionRecord[] | null = null;

  if (supabaseClient) {
    try {
      records = await loadSupabaseQuestions(supabaseClient, options.status);
    } catch (error) {
      console.error(String(error));
      console.error('Falling back to local content/questions data.');
    }
  }

  if (!records) {
    records = await loadLocalQuestions(options.status);
  }

  if (!records || records.length === 0) {
    console.error('No questions found to analyze.');
    process.exit(1);
    return;
  }

  const coverage = computeCoverage(records);
  const csv = toCsv(coverage);
  await writeOutput(csv, options.outputPath);
}

main().catch((error) => {
  console.error('Blueprint coverage script failed:', error);
  process.exit(1);
});

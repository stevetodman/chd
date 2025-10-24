import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

interface Violation {
  file: string;
  line: number;
  message: string;
  snippet?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

const LARGE_TABLES = new Set([
  'responses',
  'answer_events',
  'item_stats',
  'distractor_stats',
  'questions',
  'app_users',
  'practice_sessions',
]);

const args = process.argv.slice(2);
const allowUnsafe = args.includes('--allow-unsafe');

if (allowUnsafe) {
  console.log('Skipping migration safety checks because --allow-unsafe flag was provided.');
  process.exit(0);
}

async function getSqlFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getSqlFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      files.push(entryPath);
    }
  }

  return files;
}

function sanitizeForSearch(content: string): string {
  const withoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\r\n]/g, ' '),
  );
  const withoutLineComments = withoutBlockComments.replace(/--.*$/gm, (match) =>
    match.replace(/[^\r\n]/g, ' '),
  );
  return withoutLineComments;
}

function indexToLine(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSnippet(lines: string[], lineNumber: number): string | undefined {
  const line = lines[lineNumber - 1];
  return line?.trim();
}

function checkDropTable(
  sanitized: string,
  relativePath: string,
  lines: string[],
  violations: Violation[],
) {
  const dropTableRegex = /\bdrop\s+table\b/gi;
  let match: RegExpExecArray | null;

  while ((match = dropTableRegex.exec(sanitized))) {
    const line = indexToLine(sanitized, match.index);
    violations.push({
      file: relativePath,
      line,
      message: 'DROP TABLE detected. Dropping tables is unsafe for regular migrations.',
      snippet: getSnippet(lines, line),
    });
  }
}

function checkAlterTypeDropValue(
  sanitized: string,
  relativePath: string,
  lines: string[],
  violations: Violation[],
) {
  const alterTypeRegex = /alter\s+type\s+(?:"[^"]+"|\S+)\s+drop\s+value/gi;
  let match: RegExpExecArray | null;

  while ((match = alterTypeRegex.exec(sanitized))) {
    const line = indexToLine(sanitized, match.index);
    violations.push({
      file: relativePath,
      line,
      message: 'ALTER TYPE ... DROP VALUE detected. Removing enum values requires manual review.',
      snippet: getSnippet(lines, line),
    });
  }
}

function checkCreateIndexConcurrently(
  sanitized: string,
  relativePath: string,
  lines: string[],
  violations: Violation[],
) {
  const createIndexRegex =
    /create\s+(?:unique\s+)?index(?!\s+concurrently)(?:\s+if\s+not\s+exists)?\s+(?:"[^"]+"|\S+)\s+on\s+([^\s(]+)\s*\(/gi;

  let match: RegExpExecArray | null;

  while ((match = createIndexRegex.exec(sanitized))) {
    const rawTable = match[1].replace(/"/g, '');
    const tableName = rawTable.split('.').pop()?.toLowerCase();

    if (tableName && LARGE_TABLES.has(tableName)) {
      const line = indexToLine(sanitized, match.index);
      violations.push({
        file: relativePath,
        line,
        message: `CREATE INDEX on large table "${tableName}" must use CONCURRENTLY to avoid write locks.`,
        snippet: getSnippet(lines, line),
      });
    }
  }
}

function checkSetNotNull(
  sanitized: string,
  relativePath: string,
  lines: string[],
  violations: Violation[],
) {
  const setNotNullRegex =
    /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|\S+))\s+alter\s+column\s+((?:"[^"]+"|\S+))\s+set\s+not\s+null/gi;

  let match: RegExpExecArray | null;

  while ((match = setNotNullRegex.exec(sanitized))) {
    const rawTable = match[1].replace(/"/g, '');
    const tableName = rawTable.split('.').pop()?.toLowerCase() ?? '';
    const columnName = match[2].replace(/"/g, '').toLowerCase();

    const updateRegex = new RegExp(
      `update\\s+${escapeRegExp(tableName)}[\\s\\S]*?set[\\s\\S]*?${escapeRegExp(columnName)}`,
      'i',
    );

    if (!updateRegex.test(sanitized)) {
      const line = indexToLine(sanitized, match.index);
      violations.push({
        file: relativePath,
        line,
        message: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL requires a data backfill before enforcing the constraint.`,
        snippet: getSnippet(lines, line),
      });
    }
  }
}

async function main() {
  try {
    await fs.access(migrationsDir);
  } catch (error) {
    console.warn(`Migrations directory not found at ${migrationsDir}. Skipping safety checks.`);
    process.exit(0);
  }

  const sqlFiles = await getSqlFiles(migrationsDir);
  const violations: Violation[] = [];

  for (const filePath of sqlFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    const sanitized = sanitizeForSearch(content);
    const lines = content.split(/\r?\n/);
    const relativePath = path.relative(projectRoot, filePath);

    checkDropTable(sanitized, relativePath, lines, violations);
    checkAlterTypeDropValue(sanitized, relativePath, lines, violations);
    checkCreateIndexConcurrently(sanitized, relativePath, lines, violations);
    checkSetNotNull(sanitized, relativePath, lines, violations);
  }

  if (violations.length > 0) {
    violations.sort((a, b) => {
      if (a.file === b.file) {
        return a.line - b.line;
      }

      return a.file.localeCompare(b.file);
    });

    console.error('Unsafe migration statements detected:');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} - ${violation.message}`);
      if (violation.snippet) {
        console.error(`  > ${violation.snippet}`);
      }
    }
    console.error('If this change is intentional, rerun the check with the --allow-unsafe flag.');
    process.exit(1);
  }

  console.log('No unsafe migration patterns detected.');
}

main().catch((error) => {
  console.error('Migration safety check failed with an unexpected error.');
  console.error(error);
  process.exit(1);
});

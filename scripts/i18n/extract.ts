import fs from 'fs/promises';
import path from 'path';
import process from 'process';

import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import fg from 'fast-glob';

interface ExtractedStringMeta {
  files: Set<string>;
}

type ExtractablePath =
  | NodePath<t.StringLiteral>
  | NodePath<t.TemplateLiteral>
  | NodePath<t.JSXText>;

const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'public', 'locales', 'en.json');
const SOURCE_GLOB = ['**/*.ts', '**/*.tsx'];
const IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/build/**',
  '**/.git/**',
  'public/**'
];
const IGNORED_JSX_ATTRIBUTES = new Set([
  'className',
  'style',
  'src',
  'href',
  'to',
  'id',
  'variant',
  'size',
  'color',
  'data-testid',
  'data-test',
  'data-cy',
  'data-track'
]);

const collectedStrings = new Map<string, ExtractedStringMeta>();

interface RecordOptions {
  collapseWhitespace?: boolean;
  preserveTrim?: boolean;
}

function recordString(value: string, filePath: string, options: RecordOptions = {}) {
  const { collapseWhitespace = false, preserveTrim = false } = options;

  let candidate = collapseWhitespace ? value.replace(/\s+/gu, ' ') : value;
  candidate = preserveTrim ? candidate : candidate.trim();

  if (!candidate) {
    return;
  }

  if (!/[a-zA-Z]/u.test(candidate)) {
    return;
  }

  const normalized = collapseWhitespace ? candidate.trim() : candidate;

  const existing = collectedStrings.get(normalized);
  if (existing) {
    existing.files.add(filePath);
    return;
  }

  collectedStrings.set(normalized, { files: new Set([filePath]) });
}

function shouldSkip(path: ExtractablePath): boolean {
  const parent = path.parentPath;

  if (!parent) {
    return false;
  }

  if (parent.isImportDeclaration() || parent.isExportDeclaration()) {
    return true;
  }

  if (parent.isCallExpression()) {
    const callee = parent.get('callee');
    if (callee.isIdentifier({ name: 'require' }) || callee.isImport()) {
      return true;
    }
  }

  if (parent.isJSXAttribute()) {
    const nameNode = parent.node.name;
    if (t.isJSXIdentifier(nameNode)) {
      const attributeName = nameNode.name;
      if (IGNORED_JSX_ATTRIBUTES.has(attributeName) || attributeName.startsWith('data-')) {
        return true;
      }
    }
  }

  if (parent.isObjectProperty() && path.key === 'key' && !parent.node.computed) {
    return true;
  }

  if (parent.isDirective() || parent.isDirectiveLiteral()) {
    return true;
  }

  if (parent.isTSLiteralType() || parent.isTSTypeLiteral() || parent.isTSEnumMember()) {
    return true;
  }

  if (parent.isTemplateLiteral() && parent.node.expressions.length > 0) {
    return true;
  }

  return false;
}

function extractFromPath(path: ExtractablePath, filePath: string) {
  if (shouldSkip(path)) {
    return;
  }

  if (path.isStringLiteral()) {
    recordString(path.node.value, filePath, { preserveTrim: true });
    return;
  }

  if (path.isTemplateLiteral()) {
    if (path.node.expressions.length === 0) {
      const text = path.node.quasis.map((q) => q.value.cooked ?? '').join('');
      recordString(text, filePath, { preserveTrim: true });
    }
    return;
  }

  if (path.isJSXText()) {
    recordString(path.node.value, filePath, { collapseWhitespace: true });
  }
}

async function extractStringsFromFile(filePath: string) {
  const absolutePath = path.join(PROJECT_ROOT, filePath);
  const fileContent = await fs.readFile(absolutePath, 'utf8');

  if (!fileContent.trim()) {
    return;
  }

  let ast: t.File;
  try {
    ast = parse(fileContent, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'decorators-legacy',
        'dynamicImport'
      ]
    });
  } catch (error) {
    console.warn(`\n⚠️  Failed to parse ${filePath}:`, error instanceof Error ? error.message : error);
    return;
  }

  traverse(ast, {
    StringLiteral(path) {
      extractFromPath(path, filePath);
    },
    TemplateLiteral(path) {
      extractFromPath(path, filePath);
    },
    JSXText(path) {
      extractFromPath(path, filePath);
    }
  });
}

async function writeOutput() {
  const orderedStrings = Array.from(collectedStrings.keys()).sort((a, b) => a.localeCompare(b));
  const entries = Object.fromEntries(orderedStrings.map((key) => [key, key]));

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');

  console.log(`Extracted ${orderedStrings.length} unique strings to ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

async function main() {
  const files = await fg(SOURCE_GLOB, {
    cwd: PROJECT_ROOT,
    ignore: IGNORE_GLOBS,
    onlyFiles: true
  });

  await Promise.all(files.map((file) => extractStringsFromFile(file)));

  await writeOutput();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

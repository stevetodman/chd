import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type * as t from '@babel/types';
import { parse } from '@babel/parser';
import fg from 'fast-glob';

interface ExtractedString {
  key: string;
  value: string;
  file: string;
  line: number | null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = resolveProjectRoot();
const srcDir = path.resolve(projectRoot, 'src');
const outputPath = path.resolve(projectRoot, 'public', 'locales', 'en.json');

const existingKeys = new Set<string>();

async function main(): Promise<void> {
  const hasSrc = await directoryExists(srcDir);
  if (!hasSrc) {
    console.error(`Unable to locate src directory at ${srcDir}`);
    process.exitCode = 1;
    return;
  }

  const files = await fg('src/**/*.{ts,tsx}', {
    cwd: projectRoot,
    absolute: true,
    ignore: ['**/*.d.ts', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
  });

  const extractedStrings: ExtractedString[] = [];

  for (const filePath of files) {
    const fileStrings = await extractStringsFromFile(filePath);
    extractedStrings.push(...fileStrings);
  }

  extractedStrings.sort((a, b) => a.key.localeCompare(b.key));

  const translations: Record<string, string> = {};
  for (const entry of extractedStrings) {
    translations[entry.key] = entry.value;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(translations, null, 2) + '\n', 'utf8');

  if (extractedStrings.length === 0) {
    console.log('No strings found for extraction.');
  } else {
    console.log(`Extracted ${extractedStrings.length} strings:`);
    for (const entry of extractedStrings) {
      const location = entry.line ? `${entry.file}:${entry.line}` : entry.file;
      console.log(`- ${entry.key} (${location}) -> ${JSON.stringify(entry.value)}`);
    }
    console.log(`\nSaved translations to ${path.relative(projectRoot, outputPath)}`);
  }
}

async function extractStringsFromFile(filePath: string): Promise<ExtractedString[]> {
  const relativePath = path.relative(projectRoot, filePath);
  const code = await fs.readFile(filePath, 'utf8');

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'module',
      sourceFilename: relativePath,
      allowReturnOutsideFunction: true,
      plugins: [
        'typescript',
        'jsx',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'decorators-legacy',
        'dynamicImport',
        'optionalCatchBinding',
        'optionalChaining',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'topLevelAwait',
      ],
      errorRecovery: true,
    });
  } catch (error) {
    console.error(`Failed to parse ${relativePath}:`, error);
    return [];
  }

  const results: ExtractedString[] = [];

  walkAst(ast.program, (node, info) => {
    if (node.type === 'StringLiteral') {
      if (shouldSkipStringLiteral(node, info)) {
        return;
      }

      const text = normalizeText(node.value);
      if (!isMeaningfulText(text, info)) {
        return;
      }

      results.push(createEntry(text, filePath, node.loc?.start.line ?? null));
      return;
    }

    if (node.type === 'TemplateLiteral') {
      if (node.expressions.length > 0) {
        return;
      }
      if (shouldSkipTemplateLiteral(info)) {
        return;
      }
      const text = normalizeText(node.quasis.map((quasi) => quasi.value.cooked ?? '').join(''));
      if (!isMeaningfulText(text, info)) {
        return;
      }
      results.push(createEntry(text, filePath, node.loc?.start.line ?? null));
      return;
    }

    if (node.type === 'JSXText') {
      const text = normalizeText(node.value);
      if (!isMeaningfulText(text, info)) {
        return;
      }
      results.push(createEntry(text, filePath, node.loc?.start.line ?? null));
    }
  });

  return results;
}

function walkAst(root: t.Node, visitor: (node: t.Node, info: VisitInfo) => void): void {
  const ancestors: AncestorInfo[] = [];

  function visitNode(node: t.Node, parentInfo: AncestorInfo | null): void {
    const info: VisitInfo = {
      parent: parentInfo?.node ?? null,
      key: parentInfo?.key ?? null,
      ancestors,
    };

    visitor(node, info);

    const entries = Object.entries(node) as [string, unknown][];
    for (const [key, value] of entries) {
      if (value == null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const child of value) {
          if (!isNode(child)) {
            continue;
          }
          const ancestorInfo: AncestorInfo = { node, key };
          ancestors.push(ancestorInfo);
          visitNode(child, ancestorInfo);
          ancestors.pop();
        }
      } else if (isNode(value)) {
        const ancestorInfo: AncestorInfo = { node, key };
        ancestors.push(ancestorInfo);
        visitNode(value, ancestorInfo);
        ancestors.pop();
      }
    }
  }

  visitNode(root, null);
}

interface AncestorInfo {
  node: t.Node;
  key: string | null;
}

interface VisitInfo {
  parent: t.Node | null;
  key: string | null;
  ancestors: AncestorInfo[];
}

function shouldSkipStringLiteral(node: t.StringLiteral, info: VisitInfo): boolean {
  const parent = info.parent;
  const key = info.key;

  if (parent?.type === 'ImportDeclaration' && key === 'source') {
    return true;
  }
  if (parent?.type === 'ExportAllDeclaration' && key === 'source') {
    return true;
  }
  if (parent?.type === 'ExportNamedDeclaration' && key === 'source') {
    return true;
  }
  if (parent?.type === 'Directive') {
    return true;
  }
  if (parent?.type === 'ObjectProperty' && key === 'key' && !parent.computed) {
    return true;
  }
  if (parent?.type === 'ObjectMethod' && key === 'key') {
    return true;
  }
  if (parent?.type === 'ClassMethod' && key === 'key') {
    return true;
  }
  if (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed) {
    return true;
  }
  if (parent?.type === 'JSXAttribute' && key === 'value') {
    const attributeName = getJsxAttributeName(parent);
    if (!attributeName) {
      return true;
    }
    const normalizedName = attributeName.toLowerCase();
    if (CLASSNAME_ATTRIBUTES.has(normalizedName)) {
      return true;
    }
    if (!TRANSLATABLE_JSX_ATTRIBUTES.has(normalizedName)) {
      return true;
    }
  }
  if (parent?.type === 'CallExpression' && key === 'arguments') {
    const callee = parent.callee;
    if (callee.type === 'Import') {
      return true;
    }
    if (callee.type === 'Identifier' && callee.name === 'require') {
      return true;
    }
  }
  if (parent?.type === 'TSEnumMember') {
    return true;
  }
  if (isWithinMethodCall(info, NON_TRANSLATABLE_METHODS)) {
    return true;
  }
  if (isWithinMethodCall(info, ZOD_LITERAL_METHODS)) {
    return true;
  }
  if (isInTypeContext(info)) {
    return true;
  }

  const text = normalizeText(node.value);
  if (!isMeaningfulText(text, info)) {
    return true;
  }

  return false;
}

function shouldSkipTemplateLiteral(info: VisitInfo): boolean {
  return isInTypeContext(info);
}

function isInTypeContext(info: VisitInfo): boolean {
  if (info.parent && TYPE_CONTEXT_NODES.has(info.parent.type)) {
    return true;
  }
  return info.ancestors.some(({ node }) => TYPE_CONTEXT_NODES.has(node.type));
}

function isWithinMethodCall(info: VisitInfo, methodNames: Set<string>): boolean {
  return info.ancestors.some(({ node }) => {
    if (node.type !== 'CallExpression') {
      return false;
    }
    const callee = node.callee;
    if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
      return methodNames.has(callee.property.name);
    }
    return false;
  });
}

const TYPE_CONTEXT_NODES = new Set<string>([
  'TSLiteralType',
  'TSTypeAliasDeclaration',
  'TSTypeLiteral',
  'TSInterfaceDeclaration',
  'TSPropertySignature',
  'TSMethodSignature',
  'TSUnionType',
  'TSIntersectionType',
  'TSFunctionType',
  'TSIndexedAccessType',
  'TSMappedType',
  'TSConditionalType',
  'TSInferType',
  'TSImportType',
  'TSTypeQuery',
  'TSTypeAnnotation',
  'TSTypeParameterInstantiation',
  'TSTypeParameterDeclaration',
  'TSArrayType',
  'TSTupleType',
  'TSParenthesizedType',
  'TSQualifiedName',
  'TSModuleDeclaration',
  'TSModuleBlock',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
  'TSEnumDeclaration',
  'TSEnumMember',
]);

const NON_TRANSLATABLE_METHODS = new Set([
  'select',
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'order',
  'limit',
  'range',
  'single',
  'rpc',
  'from',
  'insert',
  'update',
  'delete',
]);

const ZOD_LITERAL_METHODS = new Set(['enum', 'literal', 'nativeEnum']);

function isNode(value: unknown): value is t.Node {
  return Boolean(value) && typeof value === 'object' && 'type' in (value as Record<string, unknown>);
}

function isClassList(value: string): boolean {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }

  const tokenPattern = /^[a-z0-9:_/\-\[\]\.%#]+$/i;
  const hasUtilityToken = tokens.some((token) => /[-:\[]/.test(token));

  if (!hasUtilityToken) {
    return false;
  }

  return tokens.every((token) => tokenPattern.test(token));
}

function getJsxAttributeName(attribute: t.JSXAttribute): string | null {
  if (attribute.name.type === 'JSXIdentifier') {
    return attribute.name.name;
  }
  if (attribute.name.type === 'JSXNamespacedName') {
    return `${attribute.name.namespace.name}:${attribute.name.name.name}`;
  }
  return null;
}

const CLASSNAME_ATTRIBUTES = new Set(['classname', 'class', 'tw']);
const TRANSLATABLE_JSX_ATTRIBUTES = new Set([
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-roledescription',
  'aria-valuetext',
  'alt',
  'placeholder',
  'title',
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isMeaningfulText(value: string, context?: VisitInfo): boolean {
  if (!value) {
    return false;
  }

  const lower = value.toLowerCase();
  if (lower === 'use strict' || lower === 'use client') {
    return false;
  }

  if (!/[a-zA-Z]/.test(value)) {
    return false;
  }

  if (isClassList(value)) {
    return false;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:')) {
    return false;
  }

  if (value.startsWith('/')) {
    return false;
  }

  if (/^[A-Z0-9_\[\]\-:]+$/.test(value) && value === value.toUpperCase()) {
    return false;
  }

  const isJsxAttribute = context?.parent?.type === 'JSXAttribute';
  if (!isJsxAttribute && !value.includes(' ') && value === value.toLowerCase() && value.length >= 1) {
    return false;
  }

  return true;
}

function createEntry(value: string, filePath: string, line: number | null): ExtractedString {
  const key = generateKey(value, filePath, line);
  const relativeFile = path.relative(projectRoot, filePath);
  return {
    key,
    value,
    file: relativeFile,
    line,
  };
}

function generateKey(value: string, filePath: string, line: number | null): string {
  const relative = path.relative(srcDir, filePath).replace(/\.[^.]+$/, '');
  const segments = relative
    .split(path.sep)
    .map((segment) => segment.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());

  let valueSegment = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (valueSegment.length > 32) {
    valueSegment = valueSegment.slice(0, 32).replace(/_+$/g, '');
  }

  if (!valueSegment) {
    valueSegment = line ? `line_${line}` : 'string';
  }

  const base = [...segments, valueSegment].filter(Boolean).join('.') || 'string';

  let candidate = base;
  let suffix = 1;
  while (existingKeys.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }

  existingKeys.add(candidate);
  return candidate;
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function resolveProjectRoot(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  for (const candidate of candidates) {
    const candidateSrc = path.resolve(candidate, 'src');
    if (existsSync(candidateSrc)) {
      return candidate;
    }
  }

  return candidates[0];
}

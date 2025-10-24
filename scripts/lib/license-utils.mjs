import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

const IGNORE_DIRECTORIES = new Set([
  '.git',
  '.github',
  'node_modules',
  'vendor',
  '.turbo',
  '.vercel',
  '.next',
]);

export const LICENSE_OVERRIDES = new Map([
  [
    'format@0.2.2',
    {
      license: 'MIT',
      rationale:
        'The npm package metadata omits the license declaration; the upstream project is published under the MIT license.',
    },
  ],
]);

export const PERMISSIBLE_LICENSES = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC-BY-4.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  '(MIT OR CC0-1.0)',
]);

function normalizeLicense(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function extractNameFromLocator(locator) {
  const segments = locator.split('/');
  const lastNodeModulesIndex = segments.lastIndexOf('node_modules');
  if (lastNodeModulesIndex === -1) {
    return locator;
  }
  const nameSegments = segments.slice(lastNodeModulesIndex + 1);
  if (nameSegments.length === 0) {
    return locator;
  }
  if (nameSegments[0].startsWith('@')) {
    return nameSegments.slice(0, 2).join('/');
  }
  return nameSegments[0];
}

async function findLockFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const child = path.join(directory, entry.name);
      const childResults = await findLockFiles(child);
      results.push(...childResults);
    } else if (entry.isFile() && entry.name === 'package-lock.json') {
      results.push(path.join(directory, entry.name));
    }
  }
  return results;
}

async function readLockFile(lockPath) {
  const content = await fs.readFile(lockPath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    const relative = path.relative(REPO_ROOT, lockPath);
    throw new Error(`Failed to parse ${relative}: ${error.message}`);
  }
}

export async function collectDependencies(rootDirectory = REPO_ROOT) {
  const lockFiles = await findLockFiles(rootDirectory);
  const dependencies = new Map();

  for (const lockPath of lockFiles) {
    const relativeLockPath = path.relative(rootDirectory, lockPath);
    const lockData = await readLockFile(lockPath);
    const packages = lockData.packages ?? {};

    for (const [locator, pkg] of Object.entries(packages)) {
      if (!pkg || locator === '' || !pkg.version) {
        continue;
      }

      const name = extractNameFromLocator(locator);
      const version = pkg.version;
      const identifier = `${name}@${version}`;
      const override = LICENSE_OVERRIDES.get(identifier);
      const resolvedLicense = normalizeLicense(pkg.license ?? override?.license ?? null);

      const existing = dependencies.get(identifier);
      const source = {
        lockfile: relativeLockPath,
        locator,
        license: normalizeLicense(pkg.license ?? null),
      };

      if (existing) {
        existing.sources.push(source);
        if (!existing.license && resolvedLicense) {
          existing.license = resolvedLicense;
        }
        existing.override = existing.override || (override != null && !pkg.license);
        continue;
      }

      dependencies.set(identifier, {
        identifier,
        name,
        version,
        license: resolvedLicense,
        override: override != null && !pkg.license,
        overrideDetails: override ?? null,
        sources: [source],
      });
    }
  }

  return dependencies;
}

export function validateLicenses(dependencies) {
  const missing = [];
  const disallowed = [];

  for (const dependency of dependencies.values()) {
    if (!dependency.license) {
      missing.push(dependency);
      continue;
    }

    if (!PERMISSIBLE_LICENSES.has(dependency.license)) {
      disallowed.push(dependency);
    }
  }

  return { missing, disallowed };
}

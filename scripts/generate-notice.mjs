import { createRequire } from 'module';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const require = createRequire(import.meta.url);
const licenseChecker = require('license-checker');

function buildHeader() {
  return [
    '# Third-Party Notices',
    '',
    'This document lists third-party packages and their associated license information.',
    '',
    'For a machine-readable inventory, see `docs/compliance/license-inventory.json`.',
    '',
    `Generated on: ${new Date().toISOString()}`,
    '',
  ].join('\n');
}

function formatPackageEntry(packageName, info) {
  const lines = [`## ${packageName}`];
  if (info.licenses) {
    lines.push(`- **License:** ${info.licenses}`);
  }
  if (info.repository) {
    lines.push(`- **Repository:** ${info.repository}`);
  }
  if (info.publisher) {
    lines.push(`- **Publisher:** ${info.publisher}`);
  }
  if (info.email) {
    lines.push(`- **Email:** ${info.email}`);
  }
  if (info.url) {
    lines.push(`- **URL:** ${info.url}`);
  }
  if (info.licenseFile) {
    const relative = path.relative(process.cwd(), info.licenseFile);
    lines.push(`- **License File:** ${relative}`);
  }
  lines.push('');
  return lines.join('\n');
}

function normalizeOptions(options = {}) {
  const cwd = options.start || process.cwd();
  const outputPath = options.outputPath
    ? path.resolve(cwd, options.outputPath)
    : path.resolve(cwd, 'NOTICE');

  return {
    start: cwd,
    outputPath,
  };
}

async function collectLicenses(start) {
  return new Promise((resolve, reject) => {
    licenseChecker.init(
      {
        start,
        production: false,
      },
      (error, packages) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(packages);
      },
    );
  });
}

export async function generateNotice(options = {}) {
  const { start, outputPath } = normalizeOptions(options);
  const packages = await collectLicenses(start);
  const sortedEntries = Object.keys(packages).sort((a, b) => a.localeCompare(b));
  const sections = [buildHeader()];

  for (const pkgName of sortedEntries) {
    sections.push(formatPackageEntry(pkgName, packages[pkgName]));
  }

  const content = sections.join('\n');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, 'utf8');
  return { outputPath, count: sortedEntries.length };
}

const thisFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath && invokedPath === thisFilePath) {
  generateNotice()
    .then((result) => {
      console.log(`Wrote license notice for ${result.count} packages to ${result.outputPath}`);
    })
    .catch((error) => {
      console.error('Failed to generate NOTICE file:', error);
      process.exitCode = 1;
    });
}

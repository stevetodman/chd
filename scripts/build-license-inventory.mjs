import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectDependencies, REPO_ROOT } from './lib/license-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(REPO_ROOT, 'docs/compliance/license-inventory.json');

async function main() {
  const dependencies = await collectDependencies(REPO_ROOT);
  const packages = Array.from(dependencies.values())
    .map((dependency) => {
      const entry = {
        name: dependency.name,
        version: dependency.version,
        license: dependency.license ?? null,
      };
      if (dependency.override) {
        entry.override = {
          license: dependency.overrideDetails?.license ?? dependency.license ?? null,
          rationale: dependency.overrideDetails?.rationale ?? null,
        };
      }
      return entry;
    })
    .sort((a, b) => {
      if (a.name === b.name) {
        return a.version.localeCompare(b.version);
      }
      return a.name.localeCompare(b.name);
    });

  const payload = {
    generatedAt: new Date().toISOString(),
    packages,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const relative = path.relative(REPO_ROOT, OUTPUT_PATH);
  console.log(`Wrote ${packages.length} packages to ${relative}`);
}

main().catch((error) => {
  console.error('Failed to build license inventory:', error);
  process.exitCode = 1;
});

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, 'artifacts');
fs.mkdirSync(artifactsDir, { recursive: true });

const lockPath = path.join(rootDir, 'package-lock.json');
if (!fs.existsSync(lockPath)) {
  console.error('package-lock.json not found');
  process.exitCode = 1;
  process.exit();
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const packages = lock.packages ?? {};

const byPackage = new Map();

for (const [pkgPath, info] of Object.entries(packages)) {
  if (!info || typeof info !== 'object') continue;
  const { version } = info;
  if (!version) continue;

  let name = info.name;
  if (!name) {
    if (!pkgPath) {
      name = lock.name ?? 'root';
    } else {
      const segments = pkgPath.split('node_modules/').filter(Boolean);
      name = segments[segments.length - 1] ?? pkgPath;
    }
  }

  const licenseValue = info.license ?? 'UNKNOWN';
  const license = Array.isArray(licenseValue) ? licenseValue.join(' OR ') : String(licenseValue);
  const key = `${name}@${version}`;
  const entry = byPackage.get(key);
  const recordPath = pkgPath || '.';

  if (entry) {
    if (!entry.paths.includes(recordPath)) {
      entry.paths.push(recordPath);
    }
  } else {
    byPackage.set(key, {
      name,
      version,
      license,
      paths: [recordPath]
    });
  }
}

const packagesArray = Array.from(byPackage.values()).sort((a, b) => {
  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;
  return a.version.localeCompare(b.version);
});

const summary = packagesArray.reduce((acc, pkg) => {
  const key = pkg.license;
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

const output = {
  generatedAt: new Date().toISOString(),
  packageCount: packagesArray.length,
  summary,
  packages: packagesArray
};

const outputPath = path.join(artifactsDir, 'licenses.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`License audit written to ${path.relative(rootDir, outputPath)}`);

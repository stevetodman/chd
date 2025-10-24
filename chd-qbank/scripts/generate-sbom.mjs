import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

const normalizeName = (pkgPath, infoName) => {
  if (infoName) return infoName;
  if (!pkgPath) return lock.name ?? 'application';
  const segments = pkgPath.split('node_modules/').filter(Boolean);
  return segments[segments.length - 1] ?? pkgPath;
};

const toLicenseObjects = (licenseValue) => {
  if (!licenseValue) {
    return [];
  }
  const licenses = Array.isArray(licenseValue) ? licenseValue : [licenseValue];
  return licenses
    .map((license) => {
      const value = typeof license === 'string' ? license : license.type ?? license.name ?? String(license);
      if (!value) return null;
      return { license: { name: value } };
    })
    .filter(Boolean);
};

const componentsMap = new Map();
let rootComponent = {
  type: 'application',
  name: lock.name ?? 'application',
  version: lock.version ?? '0.0.0'
};

for (const [pkgPath, info] of Object.entries(packages)) {
  if (!info || typeof info !== 'object') continue;
  const version = info.version;
  if (!version) continue;

  const name = normalizeName(pkgPath, info.name);
  const licenseObjects = toLicenseObjects(info.license);
  const key = `${name}@${version}`;

  if (!pkgPath) {
    rootComponent = { ...rootComponent, name, version };
    continue;
  }

  if (!componentsMap.has(key)) {
    const purlName = name.replace('/', '%2F');
    componentsMap.set(key, {
      type: 'library',
      name,
      version,
      licenses: licenseObjects,
      purl: `pkg:npm/${purlName}@${version}`
    });
  }
}

const components = Array.from(componentsMap.values()).sort((a, b) => {
  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;
  return a.version.localeCompare(b.version);
});

const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.4',
  serialNumber: `urn:uuid:${crypto.randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: rootComponent
  },
  components
};

const outputPath = path.join(artifactsDir, 'sbom.json');
fs.writeFileSync(outputPath, `${JSON.stringify(bom, null, 2)}\n`, 'utf8');
console.log(`SBOM written to ${path.relative(rootDir, outputPath)}`);

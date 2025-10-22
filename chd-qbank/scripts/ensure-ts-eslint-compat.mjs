import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const filesToUpdate = [
  {
    file: path.join(
      projectRoot,
      'node_modules',
      '@typescript-eslint',
      'typescript-estree',
      'dist',
      'parseSettings',
      'warnAboutTSVersion.js'
    ),
    apply(content) {
      const target = "const SUPPORTED_TYPESCRIPT_VERSIONS = '>=4.3.5 <5.4.0';";
      if (!content.includes(target)) {
        return null;
      }

      return content.replace(
        target,
        "const SUPPORTED_TYPESCRIPT_VERSIONS = '>=4.3.5 <6.0.0';"
      );
    }
  },
  {
    file: path.join(
      projectRoot,
      'node_modules',
      '@typescript-eslint',
      'typescript-estree',
      'dist',
      'version-check.js'
    ),
    apply(content) {
      const versionsBlock = `const versions = [\n    '4.3',\n    '4.4',\n    '4.5',\n    '4.6',\n    '4.7',\n    '4.8',\n    '4.9',\n    '5.0',\n    '5.1',\n    '5.2',\n];`;

      if (!content.includes(versionsBlock)) {
        return null;
      }

      const extendedBlock = `const versions = [\n    '4.3',\n    '4.4',\n    '4.5',\n    '4.6',\n    '4.7',\n    '4.8',\n    '4.9',\n    '5.0',\n    '5.1',\n    '5.2',\n    '5.3',\n    '5.4',\n    '5.5',\n    '5.6',\n    '5.7',\n    '5.8',\n    '5.9',\n];`;

      return content.replace(versionsBlock, extendedBlock);
    }
  }
];

let updatedAny = false;

for (const { file, apply } of filesToUpdate) {
  if (!existsSync(file)) {
    continue;
  }

  const current = readFileSync(file, 'utf8');
  const next = apply(current);

  if (next && next !== current) {
    writeFileSync(file, next, 'utf8');
    updatedAny = true;
  }
}

if (updatedAny) {
  console.log('Aligned @typescript-eslint version checks with local TypeScript version.');
}

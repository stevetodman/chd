import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORIGINAL_ENV_KEYS = new Set(Object.keys(process.env));

function parseEnvFile(envPath, loadedKeys) {
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, 'utf8');
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith('#')) return;
      const eq = line.indexOf('=');
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      const alreadyProvided = ORIGINAL_ENV_KEYS.has(key) && !loadedKeys.has(key);
      if (alreadyProvided) {
        return;
      }

      process.env[key] = value;
      loadedKeys.add(key);
    });
}

function resolveEnvFilenames(envName) {
  const normalized = envName.trim().toLowerCase();
  const candidates = [
    '.env',
    '.env.local',
    `.env.${normalized}`,
    `.env.${normalized}.local`
  ];

  return [...new Set(candidates)];
}

export function loadEnvFile(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const envName = options.env ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
  const loadedKeys = new Set();

  for (const file of resolveEnvFilenames(envName)) {
    const envPath = resolve(cwd, file);
    parseEnvFile(envPath, loadedKeys);
  }
}

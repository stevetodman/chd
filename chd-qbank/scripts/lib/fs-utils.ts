import fs from "fs";
import path from "path";

/**
 * Ensure that the provided directory exists, creating it (and parents) when necessary.
 */
export function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * Read a JSON file and parse it into the requested type.
 */
export function readJson<T = unknown>(file: string): T {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Persist structured data to disk using stable, pretty-printed JSON encoding.
 */
export function writeJsonPretty<T>(file: string, data: T): void {
  const dir = path.dirname(file);
  ensureDir(dir);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/**
 * Produce a sortable timestamp string for naming backup artifacts.
 */
export function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

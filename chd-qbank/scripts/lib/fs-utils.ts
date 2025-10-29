import fs from "fs";
import path from "path";

export function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function readJson<T = unknown>(file: string): T {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as T;
}

export function writeJsonPretty(file: string, data: unknown) {
  const dir = path.dirname(file);
  ensureDir(dir);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

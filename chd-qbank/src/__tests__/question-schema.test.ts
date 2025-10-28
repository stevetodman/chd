import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateQuestion } from "../utils/validateQuestion";

const ROOT = process.cwd();
const BASE_DIR = fs.existsSync(path.join(ROOT, "content", "questions"))
  ? ROOT
  : path.join(ROOT, "chd-qbank");
const EXAMPLE_DIR = path.join(BASE_DIR, "content", "questions");
const MEDIA_DIR = path.join(BASE_DIR, "public", "media");

function loadQuestions() {
  if (!fs.existsSync(EXAMPLE_DIR)) return [];
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
  return walk(EXAMPLE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
}

describe("QBank question shape & assets", () => {
  const questions = loadQuestions();

  it("every question matches schema", () => {
    for (const q of questions) expect(() => validateQuestion(q)).not.toThrow();
  });

  it("stable top-level keys (snapshot)", () => {
    const shapes = questions.map((q) => Object.keys(q).sort());
    expect(shapes).toMatchSnapshot();
  });

  it("choices have expected keys", () => {
    for (const q of questions) {
      const keys = q.choices.flatMap((c: any) => Object.keys(c)).sort();
      const allowed = new Set(["alt", "id", "isCorrect", "label", "mediaRef", "text"]);
      for (const key of keys) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });

  it("media files exist when referenced", () => {
    for (const q of questions) {
      for (const file of q.mediaBundle ?? []) {
        const p = path.join(MEDIA_DIR, file);
        expect(fs.existsSync(p)).toBe(true);
      }
    }
  });

  it("offlineRequired items avoid remote-only refs", () => {
    for (const q of questions) {
      if (q.offlineRequired) {
        const all = [q.stem, q.explanation, ...(q.references ?? [])].join(" ");
        expect(all).not.toMatch(/https?:\/\//i);
      }
    }
  });
});

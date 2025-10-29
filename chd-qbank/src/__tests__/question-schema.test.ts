import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateQuestion } from "../utils/validateQuestion";

const ROOT = process.cwd();
const EXAMPLE_DIR = path.join(ROOT, "chd-qbank", "content", "questions");
const MEDIA_DIR = path.join(ROOT, "chd-qbank", "public", "media");

type RawQuestion = Record<string, unknown> & {
  choices: Array<Record<string, unknown>>;
  mediaBundle?: string[] | null;
  offlineRequired?: boolean;
  stem?: string;
  explanation?: string;
  references?: string[] | null;
};

function loadQuestions(): RawQuestion[] {
  if (!fs.existsSync(EXAMPLE_DIR)) return [];
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
  return walk(EXAMPLE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(f, "utf8")) as RawQuestion);
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
      const keys = q.choices.flatMap((choice) => Object.keys(choice)).sort();
      expect(new Set(keys)).toEqual(new Set(["alt","id","isCorrect","label","mediaRef","text"]));
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

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateQuestion } from "../utils/validateQuestion";

const ROOT = process.cwd();
const EXAMPLE_DIR = path.join(ROOT, "chd-qbank", "content", "questions");
const MEDIA_DIR = path.join(ROOT, "chd-qbank", "public", "media");

type RawQuestion = Record<string, unknown> & {
  choices?: unknown;
  mediaBundle?: unknown;
  offlineRequired?: unknown;
  stem?: unknown;
  explanation?: unknown;
  references?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : String(value ?? "");

function loadQuestions(): RawQuestion[] {
  if (!fs.existsSync(EXAMPLE_DIR)) return [];
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
  return walk(EXAMPLE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(f, "utf8")) as unknown)
    .filter((value): value is RawQuestion => isRecord(value));
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
      const choiceValues = Array.isArray(q.choices) ? q.choices : [];
      const keys = choiceValues
        .flatMap((choice) => (isRecord(choice) ? Object.keys(choice) : []))
        .sort();
      expect(new Set(keys)).toEqual(new Set(["alt", "id", "isCorrect", "label", "mediaRef", "text"]));
    }
  });

  it("media files exist when referenced", () => {
    for (const q of questions) {
      const bundle = Array.isArray(q.mediaBundle) ? q.mediaBundle : [];
      for (const file of bundle) {
        const fileName = asString(file);
        const p = path.join(MEDIA_DIR, fileName);
        expect(fs.existsSync(p)).toBe(true);
      }
    }
  });

  it("offlineRequired items avoid remote-only refs", () => {
    for (const q of questions) {
      if (q.offlineRequired === true) {
        const references = Array.isArray(q.references) ? q.references : [];
        const all = [asString(q.stem), asString(q.explanation), ...references.map(asString)].join(" ");
        expect(all).not.toMatch(/https?:\/\//i);
      }
    }
  });
});

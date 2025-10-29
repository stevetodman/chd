import { z } from "zod";
import path from "path";
import type { QuestionT } from "../../src/schema/question.schema";

type NormResult = {
  normalized?: QuestionT;
  changedKeys: string[];
  addedKeys: string[];
  warnings: string[];
  errors: string[];
};

type UnknownRecord = Record<string, unknown>;

type ChoiceShape = UnknownRecord & {
  id?: string;
  label?: string;
  text?: string;
  title?: string;
  isCorrect?: boolean;
};

type MutableQuestion = UnknownRecord & {
  id?: string;
  objective?: string;
  stem?: string;
  explanation?: string;
  choices?: Array<ChoiceShape | string>;
  tags?: unknown;
  difficulty?: unknown;
  references?: unknown;
  mediaBundle?: unknown;
  media?: unknown;
  assets?: unknown;
  offlineRequired?: unknown;
};

const difficultyMap: Record<string, "easy"|"med"|"hard"> = {
  easy: "easy",
  medium: "med",
  med: "med",
  hard: "hard",
  difficult: "hard"
};

const choiceKeyCandidates = ["choices", "options", "answers"];
const answerKeyCandidates = ["answer", "key", "correct", "correctIndex", "correctLetter"];

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const toChoiceShape = (choice: ChoiceShape | string, index: number, letters: string[]): ChoiceShape => {
  if (typeof choice === "string") {
    const letter = letters[index] ?? String(index + 1);
    return { id: letters[index] ?? `C${index + 1}`, label: letter, text: choice };
  }

  const result: ChoiceShape = { ...choice };
  if (!result.id) result.id = letters[index] ?? `C${index + 1}`;
  if (!result.label) result.label = letters[index] ?? String(index + 1);
  if (result.text == null && typeof result.title === "string") {
    result.text = result.title;
  }
  return result;
};

const ensureArrayOfStrings = (value: unknown) => {
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  return value ? [String(value)] : [];
};

export function normalizeItem(
  src: unknown,
  filePath: string,
  QuestionSchema: z.ZodType<QuestionT>
): NormResult {
  if (!isRecord(src)) {
    return {
      changedKeys: [],
      addedKeys: [],
      warnings: [],
      errors: [
        `Expected a question object in ${filePath}, received ${typeof src === "object" ? "null" : typeof src}`
      ]
    };
  }

  const orig = clone(src) as UnknownRecord;
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: MutableQuestion = { ...src };

  // required top-levels
  if (!out.id) { out.id = path.basename(filePath).replace(/\.json$/i, ""); addedKeys.push("id"); }
  if (!out.objective) { out.objective = "TBD – add learning objective"; addedKeys.push("objective"); warnings.push("objective missing -> placeholder"); }
  if (!out.stem) { out.stem = "TBD – add stem"; addedKeys.push("stem"); warnings.push("stem missing -> placeholder"); }
  if (!out.explanation) { out.explanation = "TBD – add explanation"; addedKeys.push("explanation"); warnings.push("explanation missing -> placeholder"); }

  // choices
  let choicesSource: Array<ChoiceShape | string> | undefined;
  if (Array.isArray(out.choices)) {
    choicesSource = out.choices;
  } else {
    for (const key of choiceKeyCandidates) {
      const candidate = out[key];
      if (Array.isArray(candidate)) {
        choicesSource = candidate as Array<ChoiceShape | string>;
        break;
      }
    }
  }

  if (!choicesSource) {
    choicesSource = [];
    warnings.push("no choices found -> created empty choices");
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let choices = choicesSource.map((choice, index) => toChoiceShape(choice, index, letters));

  if (!choices.some((choice) => choice.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const key of answerKeyCandidates) {
      const candidate = out[key];
      if (candidate !== undefined) {
        correctFrom = candidate as string | number | undefined;
        break;
      }
    }

    if (typeof correctFrom === "number" && choices[correctFrom]) {
      choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === correctFrom }));
    } else if (typeof correctFrom === "string") {
      const idxByLetter = letters.indexOf(correctFrom.toUpperCase());
      if (idxByLetter >= 0 && choices[idxByLetter]) {
        choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === idxByLetter }));
      } else {
        const ix = choices.findIndex((choice) => {
          const text = typeof choice.text === "string" ? choice.text : "";
          return text.trim() === correctFrom.trim();
        });
        if (ix >= 0) {
          choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === ix }));
        }
      }
    }
  }
  out.choices = choices;

  // tags, difficulty, references, media
  out.tags = ensureArrayOfStrings(out.tags);
  const difficulty = typeof out.difficulty === "string" ? out.difficulty.toLowerCase() : undefined;
  out.difficulty = (difficulty ? difficultyMap[difficulty] : undefined) ?? "med";
  out.references = ensureArrayOfStrings(out.references);
  if (!Array.isArray(out.mediaBundle)) {
    const legacy = out.media ?? out.assets ?? [];
    out.mediaBundle = Array.isArray(legacy) ? legacy : (legacy ? [legacy] : []);
  }

  if (typeof out.offlineRequired !== "boolean") out.offlineRequired = false;

  // track diffs
  const beforeKeys = Object.keys(orig).sort().join("|");
  const afterKeys = Object.keys(out).sort().join("|");
  if (beforeKeys !== afterKeys) {
    const before = new Set(Object.keys(orig));
    const after = new Set(Object.keys(out));
    for (const k of after) if (!before.has(k)) addedKeys.push(k);
    for (const k of before) if (!after.has(k)) warnings.push(`legacy key kept: ${k}`);
  } else {
    ["objective","stem","explanation","difficulty"].forEach(k => {
      if (JSON.stringify(orig[k]) !== JSON.stringify(out[k])) changedKeys.push(k);
    });
  }

  // validate
  const parsed = QuestionSchema.safeParse(out);
  if (!parsed.success) {
    errors.push(parsed.error.message);
    return { changedKeys, addedKeys, warnings, errors };
  }
  return { normalized: parsed.data, changedKeys, addedKeys, warnings, errors };
}

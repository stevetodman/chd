import path from "path";
import { type ZodType } from "zod";
import type { QuestionT } from "../../src/schema/question.schema";

type NormResult = {
  normalized?: QuestionT;
  changedKeys: string[];
  addedKeys: string[];
  warnings: string[];
  errors: string[];
};

type RawQuestion = {
  [key: string]: unknown;
  choices?: unknown;
};

type MutableQuestion = RawQuestion & Partial<Omit<QuestionT, "choices">> & { choices?: unknown };

type NormalizedChoiceDraft = Record<string, unknown> & {
  id: string;
  label: string;
  text: string;
  isCorrect?: boolean;
};

const difficultyMap: Record<string, QuestionT["difficulty"]> = {
  easy: "easy",
  medium: "med",
  med: "med",
  hard: "hard",
  difficult: "hard"
};

const choiceKeyCandidates = ["choices", "options", "answers"] as const;
const answerKeyCandidates = ["answer", "key", "correct", "correctIndex", "correctLetter"];
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function toChoiceRecord(choice: unknown): Record<string, unknown> {
  if (typeof choice === "string") {
    return { text: choice };
  }
  if (typeof choice === "object" && choice !== null) {
    return { ...(choice as Record<string, unknown>) };
  }
  return {};
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
}

/**
 * Normalize legacy question payloads so they satisfy the latest Question schema.
 */
export function normalizeItem(src: RawQuestion, filePath: string, QuestionSchema: ZodType<QuestionT>): NormResult {
  const orig = JSON.parse(JSON.stringify(src)) as MutableQuestion;
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: MutableQuestion = { ...src } as MutableQuestion;

  // required top-levels
  if (typeof out.id !== "string" || out.id.trim().length === 0) {
    out.id = path.basename(filePath).replace(/\.json$/i, "");
    addedKeys.push("id");
  }
  if (typeof out.objective !== "string" || out.objective.trim().length === 0) {
    out.objective = "TBD – add learning objective";
    addedKeys.push("objective");
    warnings.push("objective missing -> placeholder");
  }
  if (typeof out.stem !== "string" || out.stem.trim().length === 0) {
    out.stem = "TBD – add stem";
    addedKeys.push("stem");
    warnings.push("stem missing -> placeholder");
  }
  if (typeof out.explanation !== "string" || out.explanation.trim().length === 0) {
    out.explanation = "TBD – add explanation";
    addedKeys.push("explanation");
    warnings.push("explanation missing -> placeholder");
  }

  // choices
  let choicesSource: unknown = out.choices;
  if (!choicesSource) {
    for (const candidateKey of choiceKeyCandidates) {
      if (out[candidateKey]) {
        choicesSource = out[candidateKey];
        break;
      }
    }
  }

  let choices: NormalizedChoiceDraft[];
  if (!Array.isArray(choicesSource)) {
    choices = [];
    warnings.push("no choices found -> created empty choices");
  } else {
    choices = choicesSource.map((choice, index) => {
      const record = toChoiceRecord(choice);
      const id = firstNonEmptyString(record.id) ?? letters[index] ?? `C${index + 1}`;
      const label = firstNonEmptyString(record.label) ?? letters[index] ?? String(index + 1);
      const text = firstNonEmptyString(record.text, record.title, choice) ?? `Choice ${letters[index] ?? index + 1}`;
      const normalized: NormalizedChoiceDraft = {
        ...record,
        id,
        label,
        text,
      };
      const isCorrect = record.isCorrect;
      if (typeof isCorrect === "boolean") {
        normalized.isCorrect = isCorrect;
      } else {
        delete normalized.isCorrect;
      }
      return normalized;
    });
  }

  // If no option is explicitly marked correct, infer it from legacy answer fields.
  if (!choices.some((choice) => choice.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const key of answerKeyCandidates) {
      const candidate = out[key];
      if (candidate != null) {
        correctFrom = candidate as string | number;
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
        const matchIndex = choices.findIndex((choice) => choice.text.trim() === correctFrom.trim());
        if (matchIndex >= 0) {
          choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === matchIndex }));
        }
      }
    }
  }
  out.choices = choices;

  // tags, difficulty, references, media
  if (!Array.isArray(out.tags)) out.tags = out.tags ? [String(out.tags)] : [];
  if (typeof out.difficulty !== "string" || out.difficulty.trim().length === 0) {
    out.difficulty = "med";
  } else {
    const normalizedDifficulty = difficultyMap[out.difficulty.toLowerCase()];
    out.difficulty = normalizedDifficulty ?? "med";
  }
  if (!Array.isArray(out.references)) out.references = out.references ? [String(out.references)] : [];
  if (!Array.isArray(out.mediaBundle)) {
    const legacyMedia = out.media ?? out.assets ?? [];
    if (Array.isArray(legacyMedia)) {
      out.mediaBundle = legacyMedia.filter((item): item is string => typeof item === "string");
    } else if (legacyMedia) {
      out.mediaBundle = [String(legacyMedia)];
    } else {
      out.mediaBundle = [];
    }
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

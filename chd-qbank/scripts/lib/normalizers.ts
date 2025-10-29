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

type LooseQuestion = Record<string, unknown> & {
  id?: string;
  objective?: unknown;
  stem?: unknown;
  explanation?: unknown;
  choices?: unknown;
  tags?: unknown;
  difficulty?: unknown;
  references?: unknown;
  mediaBundle?: unknown;
  media?: unknown;
  assets?: unknown;
  offlineRequired?: unknown;
};

type LooseChoice = Record<string, unknown> & {
  id?: string;
  label?: string;
  text?: string;
  title?: string;
  isCorrect?: boolean;
};

const difficultyMap: Record<string, "easy" | "med" | "hard"> = {
  easy: "easy",
  medium: "med",
  med: "med",
  hard: "hard",
  difficult: "hard"
};

const choiceKeyCandidates = ["choices", "options", "answers"];
const answerKeyCandidates = ["answer", "key", "correct", "correctIndex", "correctLetter"];

const cloneQuestion = (value: unknown): LooseQuestion => {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as LooseQuestion;
};

const asLooseQuestion = (value: unknown): LooseQuestion => {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  return value as LooseQuestion;
};

const normalizeChoiceShape = (choice: unknown, index: number): LooseChoice => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const defaultLabel = letters[index] ?? String(index + 1);
  const defaultId = letters[index] ?? `C${index + 1}`;

  if (typeof choice === "string") {
    return {
      id: defaultId,
      label: defaultLabel,
      text: choice,
    };
  }

  const base: LooseChoice =
    typeof choice === "object" && choice !== null ? { ...(choice as Record<string, unknown>) } : {};

  if (!base.id) {
    base.id = defaultId;
  }

  if (!base.label) {
    base.label = defaultLabel;
  }

  if (base.text == null && base.title != null) {
    base.text = String(base.title);
  }

  return base;
};

export function normalizeItem(src: unknown, filePath: string, QuestionSchema: z.ZodTypeAny): NormResult {
  const base = asLooseQuestion(src);
  const orig = cloneQuestion(base);
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: LooseQuestion = { ...base };

  // required top-levels
  if (!out.id) {
    out.id = path.basename(filePath).replace(/\.json$/i, "");
    addedKeys.push("id");
  }
  if (!out.objective) {
    out.objective = "TBD – add learning objective";
    addedKeys.push("objective");
    warnings.push("objective missing -> placeholder");
  }
  if (!out.stem) {
    out.stem = "TBD – add stem";
    addedKeys.push("stem");
    warnings.push("stem missing -> placeholder");
  }
  if (!out.explanation) {
    out.explanation = "TBD – add explanation";
    addedKeys.push("explanation");
    warnings.push("explanation missing -> placeholder");
  }

  // choices
  let choicesSource: unknown = out.choices;
  if (!choicesSource) {
    for (const key of choiceKeyCandidates) {
      const candidate = out[key];
      if (candidate) {
        choicesSource = candidate;
        break;
      }
    }
  }

  let choices: LooseChoice[];
  if (Array.isArray(choicesSource)) {
    choices = choicesSource.map((choice, index) => normalizeChoiceShape(choice, index));
  } else {
    choices = [];
    warnings.push("no choices found -> created empty choices");
  }

  const hasCorrectChoice = choices.some((choice) => choice.isCorrect === true);

  if (!hasCorrectChoice) {
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
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const trimmed = correctFrom.trim();
      const idxByLetter = letters.indexOf(trimmed.toUpperCase());
      if (idxByLetter >= 0 && choices[idxByLetter]) {
        choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === idxByLetter }));
      } else {
        const matchIndex = choices.findIndex((choice) => {
          if (typeof choice.text !== "string") {
            return false;
          }
          return choice.text.trim() === trimmed;
        });
        if (matchIndex >= 0) {
          choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === matchIndex }));
        }
      }
    }
  }

  out.choices = choices;

  // tags, difficulty, references, media
  if (!Array.isArray(out.tags)) {
    out.tags = out.tags ? [String(out.tags)] : [];
  }
  const difficulty = typeof out.difficulty === "string" ? out.difficulty.toLowerCase() : "";
  out.difficulty = difficultyMap[difficulty] ?? "med";
  if (!Array.isArray(out.references)) {
    out.references = out.references ? [String(out.references)] : [];
  }
  if (!Array.isArray(out.mediaBundle)) {
    const legacy = out.media ?? out.assets ?? [];
    out.mediaBundle = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
  }

  if (typeof out.offlineRequired !== "boolean") {
    out.offlineRequired = false;
  }

  // track diffs
  const beforeKeys = Object.keys(orig).sort().join("|");
  const afterKeys = Object.keys(out).sort().join("|");
  if (beforeKeys !== afterKeys) {
    const before = new Set(Object.keys(orig));
    const after = new Set(Object.keys(out));
    for (const k of after) if (!before.has(k)) addedKeys.push(k);
    for (const k of before) if (!after.has(k)) warnings.push(`legacy key kept: ${k}`);
  } else {
    ["objective", "stem", "explanation", "difficulty"].forEach((key) => {
      if (JSON.stringify(orig[key]) !== JSON.stringify(out[key])) changedKeys.push(key);
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

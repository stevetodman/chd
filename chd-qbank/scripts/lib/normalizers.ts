import { z } from "zod";
import path from "path";
import type { QuestionT } from "../../src/schema/question.schema";

export type QuestionDraft = Partial<QuestionT> & Record<string, unknown>;
type ChoiceDraft = Partial<QuestionT["choices"][number]> & Record<string, unknown>;

type NormResult = {
  normalized?: QuestionT;
  changedKeys: string[];
  addedKeys: string[];
  warnings: string[];
  errors: string[];
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .filter((item) => item.trim().length > 0);
  }
  if (value == null) return [];
  const text = typeof value === "string" ? value : String(value);
  return text.trim().length > 0 ? [text] : [];
};

const normalizeChoice = (choice: unknown, index: number, letters: string[]): ChoiceDraft => {
  const fallbackLabel = letters[index] ?? String(index + 1);
  const fallbackId = letters[index] ?? `C${index + 1}`;

  if (typeof choice === "string") {
    return { id: fallbackId, label: fallbackLabel, text: choice };
  }

  if (!isRecord(choice)) {
    return { id: fallbackId, label: fallbackLabel };
  }

  const draft: ChoiceDraft = { ...choice };

  if (typeof draft.id !== "string" || draft.id.trim() === "") {
    draft.id = fallbackId;
  }

  if (typeof draft.label !== "string" || draft.label.trim() === "") {
    draft.label = fallbackLabel;
  }

  if (draft.text == null && typeof draft.title === "string") {
    draft.text = draft.title;
  }

  if (draft.text != null && typeof draft.text !== "string") {
    draft.text = String(draft.text);
  }

  return draft;
};

export function normalizeItem(
  src: QuestionDraft,
  filePath: string,
  QuestionSchema: z.ZodType<QuestionT>
): NormResult {
  const orig = JSON.parse(JSON.stringify(src)) as QuestionDraft;
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: QuestionDraft = { ...src };

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

  let choiceSource: unknown = out.choices;
  if (!Array.isArray(choiceSource)) {
    for (const candidateKey of choiceKeyCandidates) {
      if (Array.isArray(out[candidateKey])) {
        choiceSource = out[candidateKey];
        break;
      }
    }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let choices: ChoiceDraft[] = Array.isArray(choiceSource)
    ? choiceSource.map((choice, index) => normalizeChoice(choice, index, letters))
    : [];

  if (!Array.isArray(choiceSource)) {
    warnings.push("no choices found -> created empty choices");
  }

  if (!choices.some((choice) => choice.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const key of answerKeyCandidates) {
      if (out[key] != null) {
        correctFrom = out[key] as string | number | undefined;
        break;
      }
    }

    const markCorrect = (indexToMark: number) =>
      choices.map((choice, index) => ({ ...choice, isCorrect: index === indexToMark }));

    if (typeof correctFrom === "number" && choices[correctFrom]) {
      choices = markCorrect(correctFrom);
    } else if (typeof correctFrom === "string") {
      const trimmed = correctFrom.trim();
      const normalized = trimmed.toUpperCase();
      const byLetter = letters.indexOf(normalized);
      if (byLetter >= 0 && choices[byLetter]) {
        choices = markCorrect(byLetter);
      } else {
        const matchByText = choices.findIndex((choice) => {
          const text = typeof choice.text === "string" ? choice.text.trim() : "";
          return text.toUpperCase() === normalized || text === trimmed;
        });
        if (matchByText >= 0) {
          choices = markCorrect(matchByText);
        }
      }
    }
  }

  out.choices = choices as QuestionT["choices"];

  out.tags = toStringArray(out.tags);
  if (!out.difficulty) {
    out.difficulty = "med";
  } else {
    const normalized = String(out.difficulty).toLowerCase();
    out.difficulty = difficultyMap[normalized] ?? "med";
  }
  out.references = toStringArray(out.references);

  if (!Array.isArray(out.mediaBundle)) {
    const legacy = out.media ?? out.assets ?? [];
    const bundle = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
    out.mediaBundle = bundle.map((item) => String(item));
  } else {
    out.mediaBundle = out.mediaBundle.map((item) => String(item));
  }

  if (typeof out.offlineRequired !== "boolean") {
    out.offlineRequired = false;
  }

  const beforeKeys = Object.keys(orig).sort().join("|");
  const afterKeys = Object.keys(out).sort().join("|");
  if (beforeKeys !== afterKeys) {
    const before = new Set(Object.keys(orig));
    const after = new Set(Object.keys(out));
    for (const key of after) {
      if (!before.has(key)) addedKeys.push(key);
    }
    for (const key of before) {
      if (!after.has(key)) warnings.push(`legacy key kept: ${key}`);
    }
  } else {
    for (const key of ["objective", "stem", "explanation", "difficulty"]) {
      if (JSON.stringify(orig[key]) !== JSON.stringify(out[key])) {
        changedKeys.push(key);
      }
    }
  }

  const parsed = QuestionSchema.safeParse(out);
  if (!parsed.success) {
    errors.push(parsed.error.message);
    return { changedKeys, addedKeys, warnings, errors };
  }

  return { normalized: parsed.data, changedKeys, addedKeys, warnings, errors };
}

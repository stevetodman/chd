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

const difficultyMap: Record<string, "easy"|"med"|"hard"> = {
  easy: "easy",
  medium: "med",
  med: "med",
  hard: "hard",
  difficult: "hard"
};

const choiceKeyCandidates = ["choices", "options", "answers"];
const answerKeyCandidates = ["answer", "key", "correct", "correctIndex", "correctLetter"];

type MutableQuestion = Record<string, unknown> & {
  id?: unknown;
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

type ChoiceCandidate = Record<string, unknown> & {
  id?: string;
  label?: string;
  text?: string;
  title?: string;
  isCorrect?: boolean;
};

type RawChoice = ChoiceCandidate & { id: string; label: string; text?: string };

export function normalizeItem(src: Record<string, unknown>, filePath: string, QuestionSchema: z.ZodTypeAny): NormResult {
  const orig = JSON.parse(JSON.stringify(src)) as MutableQuestion;
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: MutableQuestion = { ...src } as MutableQuestion;

  // required top-levels
  if (!out.id) { out.id = path.basename(filePath).replace(/\.json$/i, ""); addedKeys.push("id"); }
  if (!out.objective) { out.objective = "TBD – add learning objective"; addedKeys.push("objective"); warnings.push("objective missing -> placeholder"); }
  if (!out.stem) { out.stem = "TBD – add stem"; addedKeys.push("stem"); warnings.push("stem missing -> placeholder"); }
  if (!out.explanation) { out.explanation = "TBD – add explanation"; addedKeys.push("explanation"); warnings.push("explanation missing -> placeholder"); }

  // choices
  let choicesSource = out.choices;
  if (!choicesSource) {
    for (const k of choiceKeyCandidates) if (out[k]) { choicesSource = out[k]; break; }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let choices: RawChoice[];
  if (!Array.isArray(choicesSource)) {
    choices = [];
    warnings.push("no choices found -> created empty choices");
  } else {
    choices = choicesSource.map((choice, index) => {
      if (typeof choice === "string") {
        const id = letters[index] ?? `C${index + 1}`;
        const label = letters[index] ?? String(index + 1);
        return { id, label, text: choice };
      }

      const candidate: ChoiceCandidate = { ...choice } as ChoiceCandidate;
      if (!candidate.id) candidate.id = letters[index] ?? `C${index + 1}`;
      if (!candidate.label) candidate.label = letters[index] ?? String(index + 1);
      if (candidate.text == null && candidate.title != null) candidate.text = candidate.title;
      return candidate as RawChoice;
    });
  }

  if (!choices.some((choice) => choice.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const k of answerKeyCandidates) if (out[k] != null) { correctFrom = out[k] as string | number; break; }
    if (typeof correctFrom === "number" && choices[correctFrom]) {
      choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === correctFrom }));
    } else if (typeof correctFrom === "string") {
      const idxByLetter = letters.indexOf(correctFrom.toUpperCase());
      if (idxByLetter >= 0 && choices[idxByLetter]) {
        choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === idxByLetter }));
      } else {
        const ix = choices.findIndex((choice) => (choice.text ?? "").trim() === correctFrom.trim());
        if (ix >= 0) choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === ix }));
      }
    }
  }
  out.choices = choices;

  // tags, difficulty, references, media
  if (!Array.isArray(out.tags)) out.tags = out.tags ? [String(out.tags)] : [];
  if (!out.difficulty) out.difficulty = "med"; else out.difficulty = difficultyMap[String(out.difficulty).toLowerCase()] ?? "med";
  if (!Array.isArray(out.references)) out.references = out.references ? [String(out.references)] : [];
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

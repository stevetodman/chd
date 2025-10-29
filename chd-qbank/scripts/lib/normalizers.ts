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

type MutableQuestionLike = Partial<QuestionT> & Record<string, unknown>;
type MutableChoice = Partial<QuestionT["choices"][number]> & Record<string, unknown>;

export function normalizeItem(
  src: unknown,
  filePath: string,
  QuestionSchema: z.ZodType<QuestionT>
): NormResult {
  const orig = JSON.parse(JSON.stringify(src)) as Record<string, unknown>;
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: MutableQuestionLike = { ...(src as MutableQuestionLike) };

  // required top-levels
  if (!out.id) { out.id = path.basename(filePath).replace(/\.json$/i, ""); addedKeys.push("id"); }
  if (!out.objective) { out.objective = "TBD – add learning objective"; addedKeys.push("objective"); warnings.push("objective missing -> placeholder"); }
  if (!out.stem) { out.stem = "TBD – add stem"; addedKeys.push("stem"); warnings.push("stem missing -> placeholder"); }
  if (!out.explanation) { out.explanation = "TBD – add explanation"; addedKeys.push("explanation"); warnings.push("explanation missing -> placeholder"); }

  // choices
  let choicesCandidate: unknown = out.choices;
  if (!choicesCandidate) {
    for (const key of choiceKeyCandidates) {
      if (key in out && out[key] != null) {
        choicesCandidate = out[key];
        break;
      }
    }
  }

  const rawChoices = Array.isArray(choicesCandidate) ? choicesCandidate : [];
  if (!Array.isArray(choicesCandidate)) {
    warnings.push("no choices found -> created empty choices");
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let choices: MutableChoice[] = rawChoices.map((choice, index) => {
    if (typeof choice === "string") {
      const id = letters[index] ?? `C${index + 1}`;
      const label = letters[index] ?? String(index + 1);
      return { id, label, text: choice } satisfies MutableChoice;
    }

    const draft: MutableChoice = { ...(choice as MutableChoice) };
    if (!draft.id) draft.id = letters[index] ?? `C${index + 1}`;
    if (!draft.label) draft.label = letters[index] ?? String(index + 1);
    const titleValue = (choice as { title?: unknown }).title;
    if (draft.text == null && typeof titleValue === "string") {
      draft.text = titleValue;
    }
    return draft;
  });

  if (!choices.some((choice) => choice.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const key of answerKeyCandidates) {
      if (out[key] != null) {
        correctFrom = out[key] as string | number | undefined;
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
        const normalizedFrom = correctFrom.trim();
        const foundIndex = choices.findIndex((choice) => (choice.text ?? "").trim() === normalizedFrom);
        if (foundIndex >= 0) {
          choices = choices.map((choice, index) => ({ ...choice, isCorrect: index === foundIndex }));
        }
      }
    }
  }
  out.choices = choices;

  // tags, difficulty, references, media
  if (!Array.isArray(out.tags)) out.tags = out.tags ? [String(out.tags)] : [];
  if (!out.difficulty) out.difficulty = "med"; else out.difficulty = difficultyMap[String(out.difficulty).toLowerCase()] ?? "med";
  if (!Array.isArray(out.references)) out.references = out.references ? [String(out.references)] : [];
  if (!Array.isArray(out.mediaBundle)) {
    const legacy = (out.media ?? out.assets) as unknown;
    out.mediaBundle = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
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
    ["objective","stem","explanation","difficulty"].forEach((key) => {
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

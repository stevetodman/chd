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

const difficultyMap: Record<string, "easy" | "med" | "hard"> = {
  easy: "easy",
  medium: "med",
  med: "med",
  hard: "hard",
  difficult: "hard"
};

const choiceKeyCandidates = ["choices", "options", "answers"] as const;
const answerKeyCandidates = ["answer", "key", "correct", "correctIndex", "correctLetter"] as const;

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type LooseQuestion = Partial<QuestionT> & Record<string, unknown>;
type LooseChoice = Partial<QuestionT["choices"][number]> & Record<string, unknown>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isLooseChoiceArray = (value: unknown): value is LooseChoice[] => Array.isArray(value);

export function normalizeItem(
  src: unknown,
  filePath: string,
  QuestionSchema: z.ZodTypeAny
): NormResult {
  const base: LooseQuestion =
    typeof src === "object" && src !== null ? ({ ...(src as LooseQuestion) } as LooseQuestion) : {};
  const orig = clone(base);
  const out: LooseQuestion = { ...base };

  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const recordOut = out as Record<string, unknown>;

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

  let choiceSource: unknown = recordOut.choices;
  if (!isLooseChoiceArray(choiceSource)) {
    for (const key of choiceKeyCandidates) {
      const candidate = recordOut[key];
      if (isLooseChoiceArray(candidate)) {
        choiceSource = candidate;
        break;
      }
    }
  }

  const normalizedChoices: LooseChoice[] = (isLooseChoiceArray(choiceSource) ? choiceSource : []).map(
    (choice, index) => {
      const defaultId = letters[index] ?? `C${index + 1}`;
      const defaultLabel = letters[index] ?? String(index + 1);

      if (typeof choice === "string") {
        return {
          id: defaultId,
          label: defaultLabel,
          text: choice
        } satisfies LooseChoice;
      }

      if (typeof choice !== "object" || choice === null) {
        return {
          id: defaultId,
          label: defaultLabel,
          text: String(choice)
        } satisfies LooseChoice;
      }

      const normalized: LooseChoice = { ...(choice as LooseChoice) };

      if (!normalized.id) normalized.id = defaultId;
      if (!normalized.label) normalized.label = defaultLabel;

      if (normalized.text == null && typeof normalized.title === "string") {
        normalized.text = normalized.title;
      }

      if (normalized.text == null) {
        const raw =
          typeof normalized.text === "string"
            ? normalized.text
            : normalized.text != null
              ? String(normalized.text)
              : undefined;
        normalized.text = raw ?? "";
      }

      return normalized;
    }
  );

  if (!normalizedChoices.some((choice) => choice.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const key of answerKeyCandidates) {
      const candidate = recordOut[key];
      if (candidate != null) {
        correctFrom = candidate as string | number;
        break;
      }
    }

    if (typeof correctFrom === "number" && normalizedChoices[correctFrom]) {
      normalizedChoices.forEach((choice, index) => {
        normalizedChoices[index] = {
          ...choice,
          isCorrect: index === correctFrom
        };
      });
    } else if (typeof correctFrom === "string") {
      const normalizedKey = correctFrom.trim().toUpperCase();
      const indexByLetter = letters.indexOf(normalizedKey);
      if (indexByLetter >= 0 && normalizedChoices[indexByLetter]) {
        normalizedChoices.forEach((choice, index) => {
          normalizedChoices[index] = {
            ...choice,
            isCorrect: index === indexByLetter
          };
        });
      } else {
        const matchedIndex = normalizedChoices.findIndex((choice) => {
          if (typeof choice.text !== "string") return false;
          return choice.text.trim() === correctFrom?.toString().trim();
        });
        if (matchedIndex >= 0) {
          normalizedChoices.forEach((choice, index) => {
            normalizedChoices[index] = {
              ...choice,
              isCorrect: index === matchedIndex
            };
          });
        }
      }
    }
  }

  out.choices = normalizedChoices as QuestionT["choices"];

  if (!Array.isArray(out.tags)) out.tags = out.tags ? [String(out.tags)] : [];
  if (!out.difficulty) {
    out.difficulty = "med";
  } else {
    const key = String(out.difficulty).toLowerCase();
    out.difficulty = difficultyMap[key] ?? "med";
  }
  if (!Array.isArray(out.references)) out.references = out.references ? [String(out.references)] : [];
  if (!Array.isArray(out.mediaBundle)) {
    const legacy = recordOut.media ?? recordOut.assets ?? [];
    const legacyItems = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
    out.mediaBundle = legacyItems.map((item) => String(item));
  }

  if (typeof out.offlineRequired !== "boolean") out.offlineRequired = false;

  const beforeKeys = Object.keys(orig).sort().join("|");
  const afterKeys = Object.keys(out).sort().join("|");
  if (beforeKeys !== afterKeys) {
    const before = new Set(Object.keys(orig));
    const after = new Set(Object.keys(out));
    for (const key of after) if (!before.has(key)) addedKeys.push(key);
    for (const key of before) if (!after.has(key)) warnings.push(`legacy key kept: ${key}`);
  } else {
    ["objective", "stem", "explanation", "difficulty"].forEach((key) => {
      if (JSON.stringify(orig[key]) !== JSON.stringify(out[key])) changedKeys.push(key);
    });
  }

  const parsed = QuestionSchema.safeParse(out);
  if (!parsed.success) {
    errors.push(parsed.error.message);
    return { changedKeys, addedKeys, warnings, errors };
  }

  return { normalized: parsed.data, changedKeys, addedKeys, warnings, errors };
}

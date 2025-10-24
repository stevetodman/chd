import { z } from 'zod';
import path from 'path';
import type { QuestionT } from '../../src/schema/question.schema';

type NormResult = {
  normalized?: QuestionT;
  changedKeys: string[];
  addedKeys: string[];
  warnings: string[];
  errors: string[];
};

const difficultyMap: Record<string, 'easy' | 'med' | 'hard'> = {
  easy: 'easy',
  medium: 'med',
  med: 'med',
  hard: 'hard',
  difficult: 'hard',
};

const choiceKeyCandidates = ['choices', 'options', 'answers'];
const answerKeyCandidates = ['answer', 'key', 'correct', 'correctIndex', 'correctLetter'];

export function normalizeItem(
  src: any,
  filePath: string,
  QuestionSchema: z.ZodTypeAny,
): NormResult {
  const orig = JSON.parse(JSON.stringify(src));
  const changedKeys: string[] = [];
  const addedKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const out: any = { ...src };

  // required top-levels
  if (!out.id) {
    out.id = path.basename(filePath).replace(/\.json$/i, '');
    addedKeys.push('id');
  }
  if (!out.objective) {
    out.objective = 'TBD – add learning objective';
    addedKeys.push('objective');
    warnings.push('objective missing -> placeholder');
  }
  if (!out.stem) {
    out.stem = 'TBD – add stem';
    addedKeys.push('stem');
    warnings.push('stem missing -> placeholder');
  }
  if (!out.explanation) {
    out.explanation = 'TBD – add explanation';
    addedKeys.push('explanation');
    warnings.push('explanation missing -> placeholder');
  }

  // choices
  let choices = out.choices;
  if (!choices)
    for (const k of choiceKeyCandidates)
      if (out[k]) {
        choices = out[k];
        break;
      }
  if (!Array.isArray(choices)) {
    choices = [];
    warnings.push('no choices found -> created empty choices');
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  choices = choices.map((c: any, i: number) => {
    const cc = { ...c };
    if (!cc.id) cc.id = letters[i] ?? `C${i + 1}`;
    if (!cc.label) cc.label = letters[i] ?? String(i + 1);
    if (cc.text == null && cc.title != null) cc.text = cc.title;
    if (cc.text == null && typeof c === 'string')
      return { id: cc.id, label: cc.label, text: c as string };
    return cc;
  });

  if (!choices.some((c: any) => c.isCorrect === true)) {
    let correctFrom: string | number | undefined;
    for (const k of answerKeyCandidates)
      if (out[k] != null) {
        correctFrom = out[k];
        break;
      }
    if (typeof correctFrom === 'number' && choices[correctFrom]) {
      choices = choices.map((c: any, i: number) => ({ ...c, isCorrect: i === correctFrom }));
    } else if (typeof correctFrom === 'string') {
      const idxByLetter = letters.indexOf(correctFrom.toUpperCase());
      if (idxByLetter >= 0 && choices[idxByLetter]) {
        choices = choices.map((c: any, i: number) => ({ ...c, isCorrect: i === idxByLetter }));
      } else {
        const ix = choices.findIndex((c: any) => (c.text ?? '').trim() === correctFrom.trim());
        if (ix >= 0) choices = choices.map((c: any, i: number) => ({ ...c, isCorrect: i === ix }));
      }
    }
  }
  out.choices = choices;

  // tags, difficulty, references, media
  if (!Array.isArray(out.tags)) out.tags = out.tags ? [String(out.tags)] : [];
  if (!out.difficulty) out.difficulty = 'med';
  else out.difficulty = difficultyMap[String(out.difficulty).toLowerCase()] ?? 'med';
  if (!Array.isArray(out.references))
    out.references = out.references ? [String(out.references)] : [];
  if (!Array.isArray(out.mediaBundle)) {
    const legacy = out.media ?? out.assets ?? [];
    out.mediaBundle = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
  }

  if (typeof out.offlineRequired !== 'boolean') out.offlineRequired = false;

  // track diffs
  const beforeKeys = Object.keys(orig).sort().join('|');
  const afterKeys = Object.keys(out).sort().join('|');
  if (beforeKeys !== afterKeys) {
    const before = new Set(Object.keys(orig));
    const after = new Set(Object.keys(out));
    for (const k of after) if (!before.has(k)) addedKeys.push(k);
    for (const k of before) if (!after.has(k)) warnings.push(`legacy key kept: ${k}`);
  } else {
    ['objective', 'stem', 'explanation', 'difficulty'].forEach((k) => {
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

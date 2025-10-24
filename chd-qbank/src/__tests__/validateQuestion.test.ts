import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { validateQuestion } from '../utils/validateQuestion';

describe('validateQuestion', () => {
  it('throws the original ZodError for invalid input', () => {
    const invalidQuestion = {
      id: '', // invalid: empty id
      objective: 'Recognize a benign arrhythmia',
      stem: 'A stem without sufficient data',
      explanation: "Because it's benign.",
      choices: [], // invalid: not enough choices
    };

    try {
      validateQuestion(invalidQuestion);
      throw new Error('validateQuestion should throw for invalid data');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      const issuePaths = zodError.issues.map((issue) => issue.path.join('.'));
      expect(issuePaths).toContain('id');
      expect(issuePaths).toContain('choices');
    }
  });
});

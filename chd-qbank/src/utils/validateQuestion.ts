import { Question, QuestionT } from "../schema/question.schema";

/**
 * Assert that an arbitrary value matches the `Question` schema and return the typed result.
 *
 * @param q - Runtime value that should conform to the question schema.
 * @returns Parsed question data with static typing.
 * @throws When validation fails, propagating the Zod error for display upstream.
 */
export function validateQuestion(q: unknown): QuestionT {
  const parsed = Question.safeParse(q);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

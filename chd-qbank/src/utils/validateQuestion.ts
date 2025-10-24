import { Question, QuestionT } from '../schema/question.schema';

export function validateQuestion(q: unknown): QuestionT {
  const parsed = Question.safeParse(q);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

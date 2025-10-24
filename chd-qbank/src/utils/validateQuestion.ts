import { Question } from "../schema/question.schema";

export function validateQuestion(q: unknown) {
  const parsed = Question.safeParse(q);
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

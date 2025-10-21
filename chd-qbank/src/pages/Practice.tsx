import { useEffect, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import type { Choice, Question } from "../lib/constants";
import { SEED_QUESTIONS } from "../lib/constants";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { useSessionStore } from "../lib/auth";

export default function Practice() {
  const [questions, setQuestions] = useState<Question[]>(SEED_QUESTIONS);
  const [index, setIndex] = useState(0);
  const { session } = useSessionStore();

  useEffect(() => {
    setQuestions(SEED_QUESTIONS);
  }, []);

  const handleAnswer = async (choice: Choice, ms: number, flagged: boolean) => {
    const current = questions[index];
    if (!current || !session) return;
    await supabase.from("responses").insert({
      user_id: session.user.id,
      question_id: current.id,
      choice_id: choice.id,
      is_correct: choice.is_correct,
      ms_to_answer: ms,
      flagged
    });
    if (choice.is_correct) {
      await supabase.rpc("increment_points", { delta: 1 });
    }
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % questions.length);
  };

  const current = questions[index];

  if (!current) return <div>No questions found.</div>;

  return (
    <div className="space-y-6">
      <QuestionCard question={current} onAnswer={handleAnswer} />
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        <div>
          Q {index + 1} of {questions.length}
        </div>
        <Button type="button" onClick={next} aria-keyshortcuts="n">
          Next question
        </Button>
      </div>
    </div>
  );
}

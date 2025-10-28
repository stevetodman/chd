import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { classNames } from "../../lib/utils";
import {
  createEmbryologyQuestionSet,
  type EmbryologyOption,
  type EmbryologyQuestion,
  embryologyDeckSize
} from "../../lib/games/embryology";

export default function EmbryologyMatch() {
  const [questions, setQuestions] = useState<EmbryologyQuestion[]>(() => createEmbryologyQuestionSet());
  const [index, setIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });

  const current = questions[index] ?? null;

  const selectedOption = useMemo(
    () => (current ? current.options.find((option) => option.id === selectedOptionId) ?? null : null),
    [current, selectedOptionId]
  );

  const correctOption = useMemo(
    () => (current ? current.options.find((option) => option.isCorrect) ?? null : null),
    [current]
  );

  const handleSelect = (option: EmbryologyOption) => {
    if (!current || selectedOptionId) return;
    setSelectedOptionId(option.id);
    setFeedback(
      option.isCorrect
        ? `Correct! ${current.answer} forms when ${current.explanation}`
        : `Not quite. ${current.answer} forms when ${current.explanation}`
    );
    setScore((prev) => ({
      correct: prev.correct + (option.isCorrect ? 1 : 0),
      attempted: prev.attempted + 1
    }));
  };

  const handleNext = () => {
    if (questions.length === 0) return;
    setIndex((prev) => (prev + 1) % questions.length);
    setSelectedOptionId(null);
    setFeedback(null);
  };

  const handleReset = () => {
    setQuestions(createEmbryologyQuestionSet());
    setIndex(0);
    setSelectedOptionId(null);
    setFeedback(null);
    setScore({ correct: 0, attempted: 0 });
  };

  const scoreSummary = score.attempted
    ? `${score.correct} of ${score.attempted} correct`
    : "No attempts yet";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Embryology Match</h1>
        <p className="text-sm text-neutral-600">{scoreSummary}</p>
      </div>
      <p className="text-sm text-neutral-600">
        Practice matching high-yield congenital heart diseases to their embryologic origins from the full Step 1 deck of {embryologyDeckSize} lesions.
      </p>
      {current ? (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-brand-700">
              Question {index + 1} of {questions.length}
            </p>
            <p className="text-xs text-neutral-500">Deck reshuffles available anytime</p>
          </div>
          <p className="text-base font-medium text-neutral-900">{current.prompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="secondary"
                className={classNames(
                  "w-full justify-start text-left",
                  selectedOptionId
                    ? option.isCorrect
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : selectedOptionId === option.id
                        ? "border-rose-500 bg-rose-50 text-rose-900"
                        : "opacity-80"
                    : ""
                )}
                onClick={() => handleSelect(option)}
                disabled={Boolean(selectedOptionId)}
              >
                <span className="font-semibold">{option.lesion}</span>
              </Button>
            ))}
          </div>
          {feedback ? <p className="text-sm font-semibold text-neutral-900">{feedback}</p> : null}
          {selectedOptionId && correctOption ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <p className="font-semibold">Key facts about {correctOption.lesion}</p>
                <p className="mt-1 text-emerald-900/90">{current.explanation}</p>
                {current.associations.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-emerald-900/90">
                    {current.associations.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {selectedOption && !selectedOption.isCorrect ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                  <p className="font-semibold">Why {selectedOption.lesion} was incorrect</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-900/90">
                    {selectedOption.associations.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={questions.length === 0 || !selectedOptionId}
            >
              Next prompt
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border-transparent bg-transparent text-brand-600 shadow-none hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              onClick={handleReset}
            >
              Reshuffle deck
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
          No embryology prompts available. Try reshuffling the deck.
          <div className="mt-3">
            <Button type="button" variant="primary" onClick={handleReset}>
              Reshuffle deck
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

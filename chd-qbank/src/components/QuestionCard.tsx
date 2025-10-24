import { useState, useEffect, useMemo } from "react";
import type { Choice, Question } from "../lib/constants";
import ChoiceList from "./ChoiceList";
import Explanation from "./Explanation";
import FlagButton from "./FlagButton";
import LabPanel from "./LabPanel";
import FormulaPanel from "./FormulaPanel";
import StemHighlighter from "./StemHighlighter";
import { Button } from "./ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/Card";
import { clampMs, formatMs, classNames } from "../lib/utils";

type ResponseDetails = {
  choiceId: string | null;
  msToAnswer: number | null;
};

type Props = {
  question: Question;
  onAnswer: (choice: Choice, durationMs: number, flagged: boolean) => Promise<void> | void;
  onFlagChange?: (flagged: boolean) => Promise<void> | void;
  initialFlagged?: boolean;
  response?: ResponseDetails | null;
};

export default function QuestionCard({ question, onAnswer, onFlagChange, initialFlagged = false, response }: Props) {
  const [selected, setSelected] = useState<Choice | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [start, setStart] = useState<number>(() => performance.now());
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStart(performance.now());
    setShowExplanation(Boolean(response?.choiceId));
  }, [question.id, response?.choiceId]);

  useEffect(() => {
    setFlagged(initialFlagged);
  }, [question.id, initialFlagged]);

  useEffect(() => {
    if (!response?.choiceId) {
      setSelected(null);
      return;
    }
    const matchingChoice = question.choices.find((choice) => choice.id === response.choiceId) ?? null;
    setSelected(matchingChoice ?? null);
  }, [question.choices, response?.choiceId]);

  const handleSelect = async (choice: Choice) => {
    if (submitting) return;
    if (selected?.id === choice.id && showExplanation) return;
    const elapsed = clampMs(performance.now() - start);
    setSubmitting(true);
    setSelected(choice);
    setShowExplanation(true);
    try {
      await onAnswer(choice, elapsed, flagged);
    } catch {
      setSelected(null);
      setShowExplanation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = async () => {
    const previous = flagged;
    const next = !flagged;
    setFlagged(next);
    try {
      await onFlagChange?.(next);
    } catch {
      setFlagged(previous);
    }
  };

  const revealChoices = showExplanation || Boolean(response?.choiceId);
  const selectedChoice = useMemo(() => {
    if (!selected) return null;
    return question.choices.find((choice) => choice.id === selected.id) ?? null;
  }, [question.choices, selected]);

  const feedbackLabel = useMemo(() => {
    if (!selectedChoice) return null;
    return selectedChoice.is_correct ? "Correct" : "Keep reviewing";
  }, [selectedChoice]);

  const feedbackTone = selectedChoice?.is_correct
    ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
    : "text-red-700 bg-red-50 border border-red-200";
  const hasTiming = response?.msToAnswer !== null && response?.msToAnswer !== undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="lg:col-span-1">
        <CardHeader className="space-y-4">
          <CardTitle>{question.lead_in ?? "Question"}</CardTitle>
          <StemHighlighter stem={question.stem_md} />
        </CardHeader>
        <CardContent>
          <ChoiceList
            choices={question.choices}
            onSelect={handleSelect}
            selectedId={selected?.id ?? null}
            disabled={submitting}
            reveal={revealChoices}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {feedbackLabel ? (
              <span
                className={classNames(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                  feedbackTone
                )}
              >
                {feedbackLabel}
                {hasTiming ? (
                  <span className="font-normal">Answered in {formatMs(response?.msToAnswer ?? 0)}</span>
                ) : null}
              </span>
            ) : (
              <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500">Select an answer to check yourself</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <FlagButton flagged={flagged} onToggle={toggleFlag} />
            <Button type="button" onClick={() => setShowExplanation(true)} disabled={!selected}>
              {showExplanation ? "Review explanation" : "Reveal explanation"}
            </Button>
          </div>
        </CardFooter>
      </Card>
      <div className="space-y-4">
        {(question.context_panels ?? []).map((panel) => {
          if (!panel) return null;
          switch (panel.kind) {
            case "labs":
              return <LabPanel key={panel.id} labs={panel.labs} title={panel.title} />;
            case "formula":
              return (
                <FormulaPanel
                  key={panel.id}
                  title={panel.title}
                  formulas={panel.formulas}
                  bodyMd={panel.body_md}
                />
              );
            default:
              return null;
          }
        })}
        {showExplanation ? (
          <Explanation brief={question.explanation_brief_md} deep={question.explanation_deep_md} />
        ) : null}
      </div>
    </div>
  );
}

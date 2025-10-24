import { useState, useEffect, useRef } from "react";
import type { Choice, Question } from "../lib/constants";
import ChoiceList from "./ChoiceList";
import Explanation from "./Explanation";
import FlagButton from "./FlagButton";
import LabPanel from "./LabPanel";
import FormulaPanel from "./FormulaPanel";
import StemHighlighter from "./StemHighlighter";
import { Button } from "./ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/Card";
import { clampMs } from "../lib/utils";

type Props = {
  question: Question;
  onAnswer: (choice: Choice, durationMs: number, flagged: boolean) => Promise<void> | void;
  onFlagChange?: (flagged: boolean) => Promise<void> | void;
  initialFlagged?: boolean;
};

export default function QuestionCard({ question, onAnswer, onFlagChange, initialFlagged = false }: Props) {
  const [selected, setSelected] = useState<Choice | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [start, setStart] = useState<number>(() => performance.now());
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerCommitted, setAnswerCommitted] = useState(false);
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState("");
  const explanationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setStart(performance.now());
    setSelected(null);
    setShowExplanation(false);
    setSubmitting(false);
    setAnswerCommitted(false);
    setFeedbackAnnouncement("");
  }, [question.id]);

  useEffect(() => {
    setFlagged(initialFlagged);
  }, [question.id, initialFlagged]);

  useEffect(() => {
    if (!showExplanation) return;
    explanationRef.current?.focus({ preventScroll: false });
  }, [showExplanation]);

  const handleSelect = async (choice: Choice) => {
    if (submitting || answerCommitted) return;
    const elapsed = clampMs(performance.now() - start);
    setSubmitting(true);
    setSelected(choice);
    setShowExplanation(true);
    setFeedbackAnnouncement(
      choice.is_correct
        ? `${choice.label} is correct. The explanation is now focused.`
        : `${choice.label} is incorrect. The explanation is now focused for more details.`
    );
    try {
      await onAnswer(choice, elapsed, flagged);
      setAnswerCommitted(true);
    } catch {
      setSelected(null);
      setShowExplanation(false);
      setAnswerCommitted(false);
      setFeedbackAnnouncement("");
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div aria-live="assertive" role="status" className="sr-only">
        {feedbackAnnouncement}
      </div>
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
            showFeedback={!!selected}
            autoFocusFirst
          />
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3">
          <FlagButton flagged={flagged} onToggle={toggleFlag} />
          <Button type="button" onClick={() => setShowExplanation(true)} disabled={!selected}>
            Reveal explanation
          </Button>
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
          <Explanation
            ref={explanationRef}
            brief={question.explanation_brief_md}
            deep={question.explanation_deep_md}
            tabIndex={-1}
          />
        ) : null}
      </div>
    </div>
  );
}

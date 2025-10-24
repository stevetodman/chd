import { useState, useEffect, useRef, useMemo } from "react";
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
import CollapsibleSection from "./CollapsibleSection";
import { useMediaQuery } from "../hooks/useMediaQuery";

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
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const explanationSectionId = useMemo(() => `explanation-${question.id}`, [question.id]);

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
        <CardContent className="space-y-4">
          <ChoiceList
            choices={question.choices}
            onSelect={handleSelect}
            selectedId={selected?.id ?? null}
            showFeedback={!!selected}
            autoFocusFirst
          />
          <p className="text-xs text-neutral-500" id="choice-shortcuts-hint">
            Pro tip: press A–E or 1–5 to choose an answer instantly. Press X to strike out the focused option.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FlagButton
            flagged={flagged}
            onToggle={toggleFlag}
            className="w-full sm:w-auto"
          />
          <Button
            type="button"
            onClick={() => setShowExplanation(true)}
            disabled={!selected}
            className="w-full sm:w-auto"
          >
            Reveal explanation
          </Button>
        </CardFooter>
      </Card>
      <div className="space-y-4">
        {(question.context_panels ?? []).map((panel, index) => {
          if (!panel) return null;
          const sectionId = panel.id ? `panel-${panel.id}` : `panel-${panel.kind}-${index}`;
          const sectionTitle =
            panel.title ?? (panel.kind === "labs" ? "Vitals & Labs" : "Formula Quick Ref");
          let summary: string | undefined;
          if (panel.kind === "labs") {
            const count = panel.labs?.length ?? 0;
            summary = count > 0 ? `${count} value${count === 1 ? "" : "s"}` : undefined;
          }
          if (panel.kind === "formula") {
            const count = panel.formulas?.length ?? 0;
            summary =
              count > 0
                ? `${count} formula${count === 1 ? "" : "s"}`
                : panel.body_md
                  ? "Reference notes"
                  : undefined;
          }
          switch (panel.kind) {
            case "labs":
              return (
                <CollapsibleSection
                  key={sectionId}
                  id={sectionId}
                  title={sectionTitle}
                  summary={summary}
                  defaultOpen={isLargeScreen}
                >
                  <LabPanel labs={panel.labs} showTitle={false} labelId={sectionId} />
                </CollapsibleSection>
              );
            case "formula":
              return (
                <CollapsibleSection
                  key={sectionId}
                  id={sectionId}
                  title={sectionTitle}
                  summary={summary}
                  defaultOpen={isLargeScreen}
                >
                  <FormulaPanel
                    title={panel.title}
                    formulas={panel.formulas}
                    bodyMd={panel.body_md}
                    showTitle={false}
                    labelId={sectionId}
                  />
                </CollapsibleSection>
              );
            default:
              return null;
          }
        })}
        {showExplanation ? (
          <CollapsibleSection title="Explanation" defaultOpen id={explanationSectionId}>
            <Explanation
              ref={explanationRef}
              brief={question.explanation_brief_md}
              deep={question.explanation_deep_md}
              tabIndex={-1}
              showHeader={false}
              labelId={explanationSectionId}
            />
          </CollapsibleSection>
        ) : null}
      </div>
    </div>
  );
}

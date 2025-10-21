import { useState, useEffect } from "react";
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
};

export default function QuestionCard({ question, onAnswer }: Props) {
  const [selected, setSelected] = useState<Choice | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [start, setStart] = useState<number>(() => performance.now());
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setStart(performance.now());
    setSelected(null);
    setFlagged(false);
    setShowExplanation(false);
  }, [question.id]);

  const handleSelect = async (choice: Choice) => {
    if (selected) return;
    const elapsed = clampMs(performance.now() - start);
    setSelected(choice);
    setShowExplanation(true);
    await onAnswer(choice, elapsed, flagged);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="lg:col-span-1">
        <CardHeader className="space-y-4">
          <CardTitle>{question.lead_in ?? "Question"}</CardTitle>
          <StemHighlighter stem={question.stem_md} />
        </CardHeader>
        <CardContent>
          <ChoiceList choices={question.choices} onSelect={handleSelect} selectedId={selected?.id ?? null} />
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3">
          <FlagButton flagged={flagged} onToggle={() => setFlagged((prev) => !prev)} />
          <Button type="button" onClick={() => setShowExplanation(true)} disabled={!selected}>
            Reveal explanation
          </Button>
        </CardFooter>
      </Card>
      <div className="space-y-4">
        <LabPanel />
        <FormulaPanel />
        {showExplanation ? (
          <Explanation brief={question.explanation_brief_md} deep={question.explanation_deep_md} />
        ) : null}
      </div>
    </div>
  );
}

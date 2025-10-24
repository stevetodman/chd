import { useState } from "react";
import type { Choice } from "../lib/constants";
import type { QuestionRow } from "../lib/practice";
import ChoiceList from "./ChoiceList";
import Explanation from "./Explanation";
import StemHighlighter from "./StemHighlighter";
import LabPanel from "./LabPanel";
import FormulaPanel from "./FormulaPanel";
import { Button } from "./ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card";

export type ReviewFlag = {
  id: string;
  created_at: string;
  question: QuestionRow;
};

type Props = {
  flag: ReviewFlag;
  onMarkReviewed: () => Promise<void> | void;
  processing?: boolean;
};

export default function ReviewQuestionCard({ flag, onMarkReviewed, processing = false }: Props) {
  const { question } = flag;
  const [selected, setSelected] = useState<Choice | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (choice: Choice) => {
    if (selected) return;
    setSelected(choice);
    setShowExplanation(true);
  };

  const handleRetry = () => {
    setSelected(null);
  };

  const attemptStatus = selected ? (selected.is_correct ? "correct" : "incorrect") : "idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{question.lead_in ?? "Practice question"}</CardTitle>
        <CardDescription className="text-xs">
          Added to review on {new Date(flag.created_at).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-neutral-700">
        <StemHighlighter stem={question.stem_md} />
        <ChoiceList
          choices={question.choices}
          onSelect={handleSelect}
          selectedId={selected?.id ?? null}
          disabled={!!selected}
          showFeedback={!!selected}
        />
        {attemptStatus === "incorrect" ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            Not quite right. Review the explanation and try again.
          </div>
        ) : null}
        {attemptStatus === "correct" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            Great job! You got it correct.
          </div>
        ) : null}
        {question.context_panels.map((panel) => {
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
        <div className="flex flex-wrap items-center gap-3">
          {attemptStatus === "incorrect" ? (
            <Button type="button" variant="secondary" onClick={handleRetry}>
              Try again
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              if (!selected || !selected.is_correct || processing) return;
              void onMarkReviewed();
            }}
            disabled={!selected?.is_correct || processing}
          >
            {processing ? "Saving…" : "Mark as reviewed"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

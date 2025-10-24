import { useState, useEffect, useRef, useMemo } from 'react';
import type { Choice, Question } from '../lib/constants';
import ChoiceList from './ChoiceList';
import Explanation from './Explanation';
import FlagButton from './FlagButton';
import LabPanel from './LabPanel';
import FormulaPanel from './FormulaPanel';
import ContextPanel from './ContextPanel';
import StemHighlighter from './StemHighlighter';
import { Button } from './ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { clampMs, classNames } from '../lib/utils';
import CollapsibleSection from './CollapsibleSection';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useFeatureFlagsStore } from '../store/featureFlags';

type Props = {
  question: Question;
  onAnswer: (choice: Choice, durationMs: number, flagged: boolean) => Promise<void> | void;
  onFlagChange?: (flagged: boolean) => Promise<void> | void;
  initialFlagged?: boolean;
  onNext?: () => void;
  canAdvance?: boolean;
  progress?: { current: number; total: number };
  onPrevious?: () => void;
  canGoBack?: boolean;
};

export default function QuestionCard({
  question,
  onAnswer,
  onFlagChange,
  initialFlagged = false,
  onNext,
  canAdvance = true,
  progress,
  onPrevious,
  canGoBack = false,
}: Props) {
  const [selected, setSelected] = useState<Choice | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [start, setStart] = useState<number>(() => performance.now());
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerCommitted, setAnswerCommitted] = useState(false);
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState('');
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const explanationSectionId = useMemo(() => `explanation-${question.id}`, [question.id]);
  const tutorModeEnabled = useFeatureFlagsStore((state) => state.tutorModeEnabled);
  const showTutorRail = tutorModeEnabled;

  useEffect(() => {
    setStart(performance.now());
    setSelected(null);
    setShowExplanation(false);
    setSubmitting(false);
    setAnswerCommitted(false);
    setFeedbackAnnouncement('');
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
    const shouldShowExplanation = showTutorRail;
    setShowExplanation(shouldShowExplanation);
    setFeedbackAnnouncement(
      choice.is_correct
        ? shouldShowExplanation
          ? `${choice.label} is correct. The explanation is now focused.`
          : `${choice.label} is correct.`
        : shouldShowExplanation
          ? `${choice.label} is incorrect. The explanation is now focused for more details.`
          : `${choice.label} is incorrect.`,
    );
    try {
      await onAnswer(choice, elapsed, flagged);
      setAnswerCommitted(true);
    } catch {
      setSelected(null);
      setShowExplanation(false);
      setAnswerCommitted(false);
      setFeedbackAnnouncement('');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = async () => {
    const wasFlagged = flagged;
    const next = !flagged;
    setFlagged(next);
    try {
      await onFlagChange?.(next);
    } catch {
      setFlagged(wasFlagged);
    }
  };

  return (
    <div
      className={classNames(
        'grid gap-6',
        showTutorRail ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : undefined,
      )}
    >
      <div aria-live="assertive" role="status" className="sr-only">
        {feedbackAnnouncement}
      </div>
      <Card className="lg:col-span-1">
        <CardHeader className="space-y-4">
          <CardTitle>{question.lead_in ?? 'Question'}</CardTitle>
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
            Pro tip: press A–E or 1–5 to choose an answer instantly. Press X to strike out the
            focused option. Use ←/→ or N to move between questions when available.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:w-full sm:flex-row sm:items-center sm:justify-start">
            <FlagButton flagged={flagged} onToggle={toggleFlag} className="w-full sm:w-auto" />
            {showTutorRail ? (
              <Button
                type="button"
                onClick={() => setShowExplanation(true)}
                disabled={!selected}
                className="w-full sm:w-auto"
              >
                Reveal explanation
              </Button>
            ) : null}
          </div>
          {onNext || onPrevious ? (
            <div className="flex flex-col items-stretch gap-3 text-sm text-neutral-600 sm:w-auto sm:flex-row sm:items-center">
              {progress ? (
                <span className="text-center sm:text-left">
                  Q {progress.current} of {progress.total}
                </span>
              ) : null}
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                {onPrevious ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onPrevious}
                    aria-keyshortcuts="ArrowLeft"
                    disabled={!canGoBack}
                    className="w-full sm:w-auto"
                  >
                    Previous question
                  </Button>
                ) : null}
                {onNext ? (
                  <Button
                    type="button"
                    onClick={onNext}
                    aria-keyshortcuts="ArrowRight n"
                    disabled={!canAdvance}
                    className="w-full sm:w-auto"
                  >
                    Next question
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardFooter>
      </Card>
      {showTutorRail ? (
        <div className="space-y-4">
          {(question.context_panels ?? []).map((panel, index) => {
            if (!panel) return null;
            const sectionId = panel.id ? `panel-${panel.id}` : `panel-${panel.kind}-${index}`;
            const sectionTitle =
              panel.title ??
              (panel.kind === 'labs'
                ? 'Vitals & Labs'
                : panel.kind === 'context'
                  ? 'Context'
                  : 'Formula Quick Ref');
            const hiddenHeadingId = `${sectionId}-heading`;
            let summary: string | undefined;
            if (panel.kind === 'labs') {
              const count = panel.labs?.length ?? 0;
              summary = count > 0 ? `${count} value${count === 1 ? '' : 's'}` : undefined;
            }
            if (panel.kind === 'formula') {
              const count = panel.formulas?.length ?? 0;
              summary =
                count > 0
                  ? `${count} formula${count === 1 ? '' : 's'}`
                  : panel.body_md
                    ? 'Reference notes'
                    : undefined;
            }
            if (panel.kind === 'context') {
              const previewText = panel.body_md?.trim() ?? '';
              if (previewText) {
                summary = previewText.length > 80 ? `${previewText.slice(0, 77)}…` : previewText;
              }
            }

            let panelContent: JSX.Element | null = null;
            if (panel.kind === 'labs') {
              panelContent = <LabPanel labs={panel.labs} showTitle={false} asSection={false} />;
            }
            if (panel.kind === 'formula') {
              panelContent = (
                <FormulaPanel
                  title={panel.title}
                  formulas={panel.formulas}
                  bodyMd={panel.body_md}
                  showTitle={false}
                  asSection={false}
                />
              );
            }
            if (panel.kind === 'context') {
              panelContent = (
                <ContextPanel
                  title={panel.title}
                  bodyMd={panel.body_md}
                  showTitle={false}
                  asSection={false}
                />
              );
            }

            if (!panelContent) {
              return null;
            }

            return (
              <section
                key={sectionId}
                role="complementary"
                aria-labelledby={hiddenHeadingId}
                tabIndex={0}
                className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
              >
                <h2 id={hiddenHeadingId} className="sr-only">
                  {sectionTitle}
                </h2>
                <CollapsibleSection
                  id={sectionId}
                  title={sectionTitle}
                  summary={summary}
                  defaultOpen={isLargeScreen}
                >
                  {panelContent}
                </CollapsibleSection>
              </section>
            );
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
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageState from "../components/PageState";
import QuestionCard from "../components/QuestionCard";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import {
  DEFAULT_PRACTICE_FILTERS,
  type PracticeFilters,
  usePracticeSession
} from "../hooks/usePracticeSession";
import { useI18n } from "../i18n";

export default function Practice() {
  const {
    questions,
    currentQuestion,
    currentResponse,
    index,
    loading,
    error,
    hasMore,
    next,
    handleAnswer,
    handleFlagChange,
    sessionStats,
    sessionComplete,
    filters,
    applyFilters,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError
  } = usePracticeSession();
  const { formatMessage, formatNumber } = useI18n();
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(() => {
    if (typeof window === "undefined") return 0;
    return window.localStorage.getItem("practice:has-started") === "true" ? 2 : 0;
  });
  const [showSetup, setShowSetup] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("practice:has-started") === "true" ? false : true;
  });
  const [pendingFilters, setPendingFilters] = useState<PracticeFilters>({ ...filters });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    setPendingFilters({ ...filters });
  }, [filters]);

  const filterSummaryParts = useMemo(() => {
    const parts: string[] = [];
    if (filters.topic) parts.push(filters.topic);
    if (filters.lesion) parts.push(filters.lesion);
    if (filters.flagged === "flagged") {
      parts.push(formatMessage({ id: "practice.filters.flagged", defaultMessage: "Flagged only" }));
    }
    if (filters.status === "new") {
      parts.push(formatMessage({ id: "practice.filters.new", defaultMessage: "New questions" }));
    }
    if (filters.status === "seen") {
      parts.push(formatMessage({ id: "practice.filters.seen", defaultMessage: "Seen questions" }));
    }
    parts.push(
      formatMessage(
        {
          id: "practice.filters.sessionLength",
          defaultMessage: "{count, plural, one {# question session} other {# question session}}"
        },
        { count: filters.sessionLength }
      )
    );
    return parts;
  }, [filters, formatMessage]);

  const filterChanged = useMemo(() => {
    return (
      filters.topic !== pendingFilters.topic ||
      filters.lesion !== pendingFilters.lesion ||
      filters.flagged !== pendingFilters.flagged ||
      filters.status !== pendingFilters.status ||
      filters.sessionLength !== pendingFilters.sessionLength
    );
  }, [filters, pendingFilters]);

  const applyPendingFilters = () => {
    if (!filterChanged) return;
    applyFilters({ ...pendingFilters });
  };

  const resetFilters = () => {
    setPendingFilters({ ...DEFAULT_PRACTICE_FILTERS });
    applyFilters({ ...DEFAULT_PRACTICE_FILTERS });
  };

  useEffect(() => {
    if (questions.length === 0) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("practice:has-started", "true");
  }, [questions.length]);

  if (loading && questions.length === 0) {
    return (
      <PageState
        title={formatMessage({ id: "practice.loading.title", defaultMessage: "Loading practice session" })}
        description={formatMessage({
          id: "practice.loading.description",
          defaultMessage: "We’re generating the next set of questions for you."
        })}
        fullHeight
      />
    );
  }

  if (error && questions.length === 0) {
    return (
      <PageState
        title={formatMessage({ id: "practice.error.title", defaultMessage: "We couldn’t load questions" })}
        description={error}
        variant="error"
        fullHeight
      />
    );
  }

  if (!currentQuestion)
    return (
      <PageState
        title={formatMessage({ id: "practice.empty.title", defaultMessage: "No questions found" })}
        description={formatMessage({
          id: "practice.empty.description",
          defaultMessage: "Adjust your filters or try refreshing to start a new session."
        })}
        variant="empty"
        fullHeight
      />
    );

  const canAdvance = !(
    (!hasMore && index >= questions.length - 1) || questions.length === 0
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key?.toLowerCase() !== "n") return;
      if (!canAdvance) return;

      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      next();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance, next]);

  useEffect(() => {
    if (index === 0) return;
    if (typeof window === "undefined") return;
    if (typeof navigator === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  }, [index]);

  const selectClasses =
    "h-12 w-full rounded-lg border border-neutral-300 bg-white px-4 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const choiceClasses =
    "flex items-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500";

  const renderFilterFields = () => (
    <>
      {filterOptionsError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {filterOptionsError}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {formatMessage({ id: "practice.filters.topic", defaultMessage: "Topic" })}
          </span>
          <select
            className={selectClasses}
            value={pendingFilters.topic ?? ""}
            onChange={(event) =>
              setPendingFilters((prev) => ({
                ...prev,
                topic: event.target.value ? event.target.value : null
              }))
            }
            disabled={filterOptionsLoading}
          >
            <option value="">
              {formatMessage({ id: "practice.filters.topic.all", defaultMessage: "All topics" })}
            </option>
            {filterOptions.topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {formatMessage({ id: "practice.filters.lesion", defaultMessage: "Lesion" })}
          </span>
          <select
            className={selectClasses}
            value={pendingFilters.lesion ?? ""}
            onChange={(event) =>
              setPendingFilters((prev) => ({
                ...prev,
                lesion: event.target.value ? event.target.value : null
              }))
            }
            disabled={filterOptionsLoading}
          >
            <option value="">
              {formatMessage({ id: "practice.filters.lesion.all", defaultMessage: "All lesions" })}
            </option>
            {filterOptions.lesions.map((lesion) => (
              <option key={lesion} value={lesion}>
                {lesion}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {formatMessage({ id: "practice.filters.status", defaultMessage: "Question status" })}
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              value: "all",
              label: formatMessage({ id: "practice.filters.status.all", defaultMessage: "All questions" })
            },
            {
              value: "new",
              label: formatMessage({ id: "practice.filters.status.new", defaultMessage: "New to me" })
            },
            {
              value: "seen",
              label: formatMessage({ id: "practice.filters.status.seen", defaultMessage: "Seen before" })
            }
          ].map((option) => (
            <label key={option.value} className={choiceClasses}>
              <input
                type="radio"
                name="question-status"
                value={option.value}
                checked={pendingFilters.status === option.value}
                onChange={() =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    status: option.value as PracticeFilters["status"]
                  }))
                }
                className="h-5 w-5"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={choiceClasses}>
        <input
          type="checkbox"
          checked={pendingFilters.flagged === "flagged"}
          onChange={(event) =>
            setPendingFilters((prev) => ({
              ...prev,
              flagged: event.target.checked ? "flagged" : "all"
            }))
          }
          className="h-5 w-5"
        />
        <span>{formatMessage({ id: "practice.filters.flaggedOnly", defaultMessage: "Show only questions I’ve flagged" })}</span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {formatMessage({ id: "practice.filters.sessionLengthLabel", defaultMessage: "Session length" })}
        </span>
        <select
          className={selectClasses}
          value={pendingFilters.sessionLength}
          onChange={(event) =>
            setPendingFilters((prev) => ({
              ...prev,
              sessionLength: Number(event.target.value)
            }))
          }
        >
          {[10, 20, 30, 40].map((length) => (
            <option key={length} value={length}>
              {formatMessage(
                { id: "practice.filters.sessionLengthOption", defaultMessage: "{count} questions" },
                { count: length }
              )}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  const totalSetupSteps = 3;
  const setupProgress = ((setupStep + 1) / totalSetupSteps) * 100;

  const handleBeginPractice = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("practice:has-started", "true");
    }
    setShowSetup(false);
    setSetupStep(2);
  };

  if (showSetup) {
    const setupTitles = [
      formatMessage({
        id: "practice.setup.introTitle",
        defaultMessage: "Re-center before you start"
      }),
      formatMessage({
        id: "practice.setup.filtersTitle",
        defaultMessage: "Choose your focus"
      }),
      formatMessage({
        id: "practice.setup.readyTitle",
        defaultMessage: "You're set for a focused round"
      })
    ];

    const setupDescriptions = [
      formatMessage({
        id: "practice.setup.introDescription",
        defaultMessage:
          "We'll guide you through a quick warm-up so the session feels intentional, calm, and tailored to what you need right now."
      }),
      formatMessage({
        id: "practice.setup.filtersDescription",
        defaultMessage: "Tune the filters that power your quiz so every question aligns with your current goals."
      }),
      formatMessage({
        id: "practice.setup.readyDescription",
        defaultMessage:
          "Here’s the plan we’ll hold steady while you work. Your question viewport stays pinned, and you can advance with a tap or the N key."
      })
    ];

    const stepIndicator = formatMessage(
      {
        id: "practice.setup.stepIndicator",
        defaultMessage: "Step {current} of {total}"
      },
      { current: setupStep + 1, total: totalSetupSteps }
    );

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
        <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
          <span>{stepIndicator}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${setupProgress}%` }} />
          </div>
        </div>
        <Card className="border-none bg-white/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl font-semibold text-neutral-900">{setupTitles[setupStep]}</CardTitle>
            <p className="text-sm text-neutral-600">{setupDescriptions[setupStep]}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-neutral-700">
            {setupStep === 0 ? (
              <>
                <ul className="space-y-3">
                  {[
                    formatMessage({
                      id: "practice.setup.introBulletIntent",
                      defaultMessage: "Lock in your intention for today’s session."
                    }),
                    formatMessage({
                      id: "practice.setup.introBulletFilters",
                      defaultMessage: "Review or adjust the filters shaping your next set of questions."
                    }),
                    formatMessage({
                      id: "practice.setup.introBulletFocus",
                      defaultMessage: "Preview the focus cues we’ll use to keep the canvas steady."
                    })
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={handleBeginPractice} className="sm:w-auto">
                    {formatMessage({ id: "practice.setup.introSkip", defaultMessage: "Skip setup for now" })}
                  </Button>
                  <Button type="button" onClick={() => setSetupStep(1)} className="sm:w-auto">
                    {formatMessage({ id: "practice.setup.introPrimary", defaultMessage: "Customize session" })}
                  </Button>
                </div>
              </>
            ) : null}
            {setupStep === 1 ? (
              <>
                <div className="space-y-6">{renderFilterFields()}</div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button type="button" variant="secondary" onClick={() => setSetupStep(0)} className="sm:w-auto">
                    {formatMessage({ id: "practice.setup.back", defaultMessage: "Back" })}
                  </Button>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" variant="secondary" onClick={resetFilters} className="sm:w-auto">
                      {formatMessage({ id: "practice.filters.reset", defaultMessage: "Reset to defaults" })}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        applyPendingFilters();
                        setSetupStep(2);
                      }}
                      className="sm:w-auto"
                    >
                      {formatMessage({ id: "practice.setup.saveAndContinue", defaultMessage: "Save & continue" })}
                    </Button>
                  </div>
                </div>
                {filterOptionsLoading ? (
                  <span className="text-xs text-neutral-500">
                    {formatMessage({ id: "practice.filters.loading", defaultMessage: "Loading filter options…" })}
                  </span>
                ) : null}
              </>
            ) : null}
            {setupStep === 2 ? (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {formatMessage({ id: "practice.setup.summaryHeading", defaultMessage: "Session outline" })}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {filterSummaryParts.map((part, index) => (
                        <span
                          key={`${part}-${index}`}
                          className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p>
                    {formatMessage({
                      id: "practice.setup.readyNote",
                      defaultMessage:
                        "We’ll start in focus mode with keyboard shortcuts, gentle haptics on mobile, and a steady viewport that keeps the question centered."
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button type="button" variant="secondary" onClick={() => setSetupStep(1)} className="sm:w-auto">
                    {formatMessage({ id: "practice.setup.adjust", defaultMessage: "Adjust filters" })}
                  </Button>
                  <Button type="button" onClick={handleBeginPractice} className="sm:w-auto">
                    {formatMessage({ id: "practice.setup.begin", defaultMessage: "Begin practice" })}
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16 pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <div className="flex min-h-0 flex-col gap-6">
        <Card className="border border-brand-100 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg font-semibold text-neutral-900">
              {formatMessage({ id: "practice.focus.header", defaultMessage: "Guided practice" })}
            </CardTitle>
            <p className="text-sm text-neutral-600">
              {formatMessage({
                id: "practice.focus.description",
                defaultMessage: "Your question canvas stays anchored so you can stay responsive without juggling overlays."
              })}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] uppercase tracking-wide text-white">
              {formatMessage({ id: "practice.focus.shortcut", defaultMessage: "Press N for next" })}
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              {formatMessage(
                {
                  id: "practice.progress.counter",
                  defaultMessage: "Q {current, number, integer} of {total, number, integer}"
                },
                { current: index + 1, total: questions.length }
              )}
            </span>
            {filterSummaryParts.map((part, idx) => (
              <span key={`${part}-${idx}`} className="rounded-full bg-neutral-100 px-3 py-1">
                {part}
              </span>
            ))}
          </CardContent>
        </Card>
        <div className="flex flex-1 flex-col">
          <div className="flex h-full min-h-[60vh] flex-col">
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              onFlagChange={handleFlagChange}
              initialFlagged={currentResponse?.flagged ?? false}
              onNext={next}
              canAdvance={canAdvance}
              progress={{ current: index + 1, total: questions.length }}
            />
          </div>
        </div>
        {sessionComplete ? (
          <Card className="border-emerald-200">
            <CardHeader>
              <CardTitle className="text-base">
                {formatMessage({ id: "practice.sessionComplete.title", defaultMessage: "Session complete" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-700">
              <p>
                {formatMessage(
                  {
                    id: "practice.sessionComplete.summary",
                    defaultMessage:
                      "You worked through {count, plural, one {# question} other {# questions}} this round. Here’s how it went:"
                  },
                  { count: sessionStats.totalAnswered }
                )}
              </p>
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-neutral-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {formatMessage({ id: "practice.sessionComplete.accuracyLabel", defaultMessage: "Accuracy" })}
                  </dt>
                  <dd className="text-lg font-semibold text-neutral-900">
                    {sessionStats.accuracy !== null
                      ? formatNumber(sessionStats.accuracy, { style: "percent", maximumFractionDigits: 0 })
                      : formatMessage({
                          id: "practice.sessionComplete.accuracyEmpty",
                          defaultMessage: "Not enough data"
                        })}
                  </dd>
                </div>
                <div className="rounded-md bg-neutral-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {formatMessage({ id: "practice.sessionComplete.correctLabel", defaultMessage: "Correct answers" })}
                  </dt>
                  <dd className="text-lg font-semibold text-neutral-900">
                    {formatNumber(sessionStats.totalCorrect)} / {formatNumber(sessionStats.totalAnswered)}
                  </dd>
                </div>
                <div className="rounded-md bg-neutral-50 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {formatMessage({ id: "practice.sessionComplete.averageTimeLabel", defaultMessage: "Avg. time" })}
                  </dt>
                  <dd className="text-lg font-semibold text-neutral-900">
                    {sessionStats.averageMs !== null
                      ? formatNumber(sessionStats.averageMs / 1000, {
                          style: "unit",
                          unit: "second",
                          unitDisplay: "narrow",
                          maximumFractionDigits: 1
                        })
                      : formatMessage({
                          id: "practice.sessionComplete.averageTimeEmpty",
                          defaultMessage: "Not recorded"
                        })}
                  </dd>
                </div>
              </dl>
              {sessionStats.flagged > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <p className="font-medium">
                    {formatMessage(
                      {
                        id: "practice.sessionComplete.flagged",
                        defaultMessage:
                          "{count, plural, one {# question saved for spaced review.} other {# questions saved for spaced review.}}"
                      },
                      { count: sessionStats.flagged }
                    )}
                  </p>
                  <p className="text-sm">
                    {formatMessage({
                      id: "practice.sessionComplete.reviewPrompt.before",
                      defaultMessage: "Revisit them on the "
                    })}
                    <Link to="/review" className="font-semibold underline">
                      {formatMessage({
                        id: "practice.sessionComplete.reviewLink",
                        defaultMessage: "review page"
                      })}
                    </Link>
                    {formatMessage({
                      id: "practice.sessionComplete.reviewPrompt.after",
                      defaultMessage: " tomorrow to lock in the learning."
                    })}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
                  <p className="font-medium">
                    {formatMessage({
                      id: "practice.sessionComplete.noFlagged",
                      defaultMessage: "No flagged questions yet."
                    })}
                  </p>
                  <p className="text-sm">
                    {formatMessage({
                      id: "practice.sessionComplete.noFlaggedDescription",
                      defaultMessage: "Flag tricky items during practice so they’ll show up in your spaced-review queue."
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
      <aside className="flex flex-col gap-6">
        <Card className="border border-neutral-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-neutral-900">
              {formatMessage({ id: "practice.controls.title", defaultMessage: "Session controls" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-neutral-700">
            <p>
              {formatMessage({
                id: "practice.controls.description",
                defaultMessage: "Tweak filters or revisit the warm-up without losing your place."
              })}
            </p>
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {formatMessage({ id: "practice.controls.activeFilters", defaultMessage: "Active filters" })}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filterSummaryParts.map((part, index) => (
                    <span
                      key={`${part}-${index}`}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFiltersExpanded((open) => !open)}
                className="w-full"
              >
                {filtersExpanded
                  ? formatMessage({ id: "practice.filters.hide", defaultMessage: "Hide filters" })
                  : formatMessage({ id: "practice.filters.show", defaultMessage: "Show filters" })}
              </Button>
              {filtersExpanded ? (
                <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="space-y-6">{renderFilterFields()}</div>
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        applyPendingFilters();
                        setFiltersExpanded(false);
                      }}
                      disabled={!filterChanged}
                    >
                      {formatMessage({ id: "practice.filters.apply", defaultMessage: "Apply filters" })}
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetFilters}>
                      {formatMessage({ id: "practice.filters.reset", defaultMessage: "Reset to defaults" })}
                    </Button>
                    {filterOptionsLoading ? (
                      <span className="text-xs text-neutral-500">
                        {formatMessage({ id: "practice.filters.loading", defaultMessage: "Loading filter options…" })}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowSetup(true);
                setSetupStep(0);
              }}
            >
              {formatMessage({ id: "practice.controls.restartSetup", defaultMessage: "Restart warm-up wizard" })}
            </Button>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-neutral-900">
              {formatMessage({ id: "practice.focus.tipsTitle", defaultMessage: "Flow tips" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-700">
            <p>
              {formatMessage({
                id: "practice.focus.tipShortcuts",
                defaultMessage: "Use the keyboard to stay in rhythm—press A–E to answer, X to strike out, and N to move forward."
              })}
            </p>
            <p>
              {formatMessage({
                id: "practice.focus.tipHaptics",
                defaultMessage: "On mobile, a gentle haptic pulse confirms each new question so you can keep your eyes on the stem."
              })}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

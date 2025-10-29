import { useReducer, useEffect, useCallback, useRef, useId } from "react";
import ReactMarkdown from "react-markdown";
import type { Choice } from "../lib/constants";
import { classNames } from "../lib/utils";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";

type Props = {
  choices: Choice[];
  disabled?: boolean;
  onSelect: (choice: Choice) => void;
  selectedId?: string | null;
  showFeedback?: boolean;
  autoFocusFirst?: boolean;
};

type StrikeState = Record<string, boolean>;
type StrikeAction =
  | { type: "toggle"; id: string }
  | { type: "reset"; ids: string[] };

const strikeReducer = (state: StrikeState, action: StrikeAction): StrikeState => {
  switch (action.type) {
    case "toggle": {
      const next: StrikeState = { ...state };
      next[action.id] = !next[action.id];
      return next;
    }
    case "reset": {
      const allowed = new Set(action.ids);
      const next: StrikeState = {};
      for (const id of Object.keys(state)) {
        if (allowed.has(id) && state[id]) {
          next[id] = true;
        }
      }
      return next;
    }
    default:
      return state;
  }
};

export default function ChoiceList({
  choices,
  disabled,
  onSelect,
  selectedId,
  showFeedback = false,
  autoFocusFirst = false
}: Props) {
  const [struck, dispatch] = useReducer(strikeReducer, {});
  const idPrefix = useId();
  const firstChoiceRef = useRef<HTMLButtonElement | null>(null);

  const toggleStrike = useCallback((id: string) => {
    dispatch({ type: "toggle", id });
  }, []);

  useEffect(() => {
    dispatch({ type: "reset", ids: choices.map((choice) => choice.id) });
  }, [choices]);

  useEffect(() => {
    if (!autoFocusFirst || disabled) return;
    if (selectedId !== undefined && selectedId !== null) return;
    firstChoiceRef.current?.focus({ preventScroll: true });
  }, [autoFocusFirst, disabled, selectedId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (!e.key) return;

      const key = e.key.toLowerCase();

      if (key === "x") {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          const choiceId = activeElement.dataset.choiceId;
          if (choiceId) {
            e.preventDefault();
            toggleStrike(choiceId);
          }
        }
        return;
      }

      const matchedChoice = choices.find((choice, index) => {
        const label = choice.label.toLowerCase();
        const indexKey = String(index + 1);
        return key === label || key === indexKey;
      });

      if (matchedChoice) {
        e.preventDefault();
        onSelect(matchedChoice);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choices, disabled, onSelect, toggleStrike]);

  return (
    <div className="space-y-3">
      {choices.map((choice, index) => {
        const isSelected = selectedId === choice.id;
        const reveal = showFeedback && selectedId !== null;
        const isCorrect = choice.is_correct;
        const showAsCorrect = reveal && isCorrect;
        const showAsIncorrectSelection = reveal && isSelected && !isCorrect;
        const showAsCorrectSelection = reveal && isSelected && isCorrect;
        const isStruck = struck[choice.id];
        const buttonLabelId = `${idPrefix}-label-${choice.id}`;
        const textContainerId = `${idPrefix}-text-${choice.id}`;
        return (
          <button
            key={choice.id}
            type="button"
            aria-keyshortcuts={`${choice.label.toLowerCase()},${choice.label}`}
            aria-labelledby={`${buttonLabelId} ${textContainerId}`}
            disabled={disabled}
            data-choice-id={choice.id}
            onClick={() => onSelect(choice)}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleStrike(choice.id);
            }}
            ref={(element) => {
              if (index === 0) {
                firstChoiceRef.current = element;
              }
            }}
            className={classNames(
              "choice-option w-full rounded-md border border-neutral-200 bg-white p-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500",
              isSelected && !reveal && "border-brand-500 ring-2 ring-brand-500",
              showAsCorrectSelection &&
                "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300",
              showAsIncorrectSelection &&
                "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-300",
              showAsCorrect && !isSelected && "border-emerald-400 bg-emerald-50 text-emerald-900",
              isStruck && "line-through text-neutral-400"
            )}
            data-state={
              !reveal
                ? isSelected
                  ? "selected"
                  : "idle"
                : showAsCorrectSelection
                  ? "correct"
                  : showAsIncorrectSelection
                    ? "incorrect"
                    : showAsCorrect
                      ? "correct-answer"
                      : "revealed"
            }
          >
            <div className="flex items-start gap-3">
              <span id={buttonLabelId} className="font-semibold">{choice.label}.</span>
              <div id={textContainerId} className="flex-1 space-y-1">
                <ReactMarkdown
                  remarkPlugins={markdownRemarkPlugins}
                  rehypePlugins={markdownRehypePlugins}
                  className="prose prose-sm max-w-none"
                >
                  {choice.text_md}
                </ReactMarkdown>
                {reveal ? (
                  <p
                    className={classNames(
                      "text-sm font-medium",
                      showAsCorrectSelection || (showAsCorrect && !isSelected)
                        ? "text-emerald-700"
                        : showAsIncorrectSelection
                          ? "text-rose-700"
                          : "text-neutral-500"
                    )}
                    role={isSelected ? "status" : undefined}
                  >
                    {showAsCorrectSelection
                      ? "Correct answer"
                      : showAsIncorrectSelection
                        ? "Your answer — incorrect"
                        : showAsCorrect
                          ? "Correct answer"
                          : null}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

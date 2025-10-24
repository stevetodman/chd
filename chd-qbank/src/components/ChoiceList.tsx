import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { Choice } from "../lib/constants";
import { classNames } from "../lib/utils";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";

type Props = {
  choices: Choice[];
  disabled?: boolean;
  onSelect: (choice: Choice) => void;
  selectedId?: string | null;
  reveal?: boolean;
};

export default function ChoiceList({ choices, disabled, onSelect, selectedId, reveal }: Props) {
  const [struck, setStruck] = useState<Record<string, boolean>>({});

  const toggleStrike = useCallback((id: string) => {
    setStruck((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    setStruck({});
  }, [choices]);

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
      {choices.map((choice) => {
        const isSelected = selectedId === choice.id;
        const isStruck = struck[choice.id];
        const isCorrect = choice.is_correct;
        const showReveal = Boolean(reveal);
        return (
          <button
            key={choice.id}
            type="button"
            aria-keyshortcuts={`${choice.label.toLowerCase()},${choice.label}`}
            disabled={disabled}
            data-choice-id={choice.id}
            onClick={() => onSelect(choice)}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleStrike(choice.id);
            }}
            className={classNames(
              "w-full rounded-md border border-neutral-200 bg-white p-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500",
              isSelected && !showReveal && "border-brand-500 ring-2 ring-brand-500",
              isStruck && !showReveal && "line-through text-neutral-400",
              showReveal && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-900",
              showReveal && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-900",
              showReveal && !isSelected && !isCorrect && "opacity-70"
            )}
          >
            <span className="mr-2 font-semibold">{choice.label}.</span>
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="inline prose prose-sm max-w-none"
            >
              {choice.text_md}
            </ReactMarkdown>
            {showReveal && (isCorrect || isSelected) ? (
              <div className="mt-2 text-xs font-medium">
                {isCorrect ? "Correct answer" : "Your choice"}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

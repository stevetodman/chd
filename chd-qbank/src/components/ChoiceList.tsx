import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import type { Choice } from "../lib/constants";
import { classNames } from "../lib/utils";

type Props = {
  choices: Choice[];
  disabled?: boolean;
  onSelect: (choice: Choice) => void;
  selectedId?: string | null;
};

export default function ChoiceList({ choices, disabled, onSelect, selectedId }: Props) {
  const [struck, setStruck] = useState<Record<string, boolean>>({});

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

      const index = Number.parseInt(key, 10) - 1;
      if (index >= 0 && index < choices.length) {
        onSelect(choices[index]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, disabled]);

  const toggleStrike = (id: string) => {
    setStruck((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-3">
      {choices.map((choice) => {
        const isSelected = selectedId === choice.id;
        const isStruck = struck[choice.id];
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
              isSelected && "border-brand-500 ring-2 ring-brand-500",
              isStruck && "line-through text-neutral-400"
            )}
          >
            <span className="mr-2 font-semibold">{choice.label}.</span>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
              className="inline prose prose-sm max-w-none"
            >
              {choice.text_md}
            </ReactMarkdown>
          </button>
        );
      })}
    </div>
  );
}

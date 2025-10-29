import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { classNames } from "../lib/utils";

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  onToggle?: (open: boolean) => void;
  id?: string;
};

export default function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
  onToggle,
  id
}: Props) {
  const generatedId = useId();
  const headingId = id ?? generatedId;
  const contentId = `${headingId}-content`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (open === defaultOpen) return;
    const timeout = setTimeout(() => setOpen(defaultOpen), 0);
    return () => clearTimeout(timeout);
  }, [defaultOpen, open]);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-4 text-left text-base font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={title}
        id={headingId}
      >
        <div className="flex flex-1 flex-col gap-1">
          <span>{title}</span>
          {summary ? (
            <span className="text-sm font-normal text-neutral-500">{summary}</span>
          ) : null}
        </div>
        <span
          aria-hidden
          className={classNames(
            "grid h-9 w-9 place-items-center rounded-full border border-neutral-300 text-lg transition-transform",
            open ? "bg-neutral-100" : "bg-white"
          )}
        >
          {open ? "–" : "+"}
        </span>
      </button>
      {open ? (
        <div
          id={contentId}
          role="region"
          aria-labelledby={headingId}
          className="border-t border-neutral-200 p-4 text-sm text-neutral-700"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { classNames } from "../lib/utils";
import { Button } from "./ui/Button";

type ErrorAlertProps = {
  title?: string;
  description: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function ErrorAlert({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  actions,
  className
}: ErrorAlertProps) {
  return (
    <div
      className={classNames(
        "flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      role="alert"
    >
      <div className="flex flex-1 items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
        </span>
        <div className="space-y-1">
          {title ? <h3 className="text-sm font-semibold text-rose-700">{title}</h3> : null}
          <div className="text-sm text-rose-800">{description}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onRetry ? (
          <Button type="button" onClick={onRetry} disabled={!onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

export default ErrorAlert;

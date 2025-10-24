import type { ReactNode } from "react";
import { classNames } from "../lib/utils";

export type PageStateStatus = "loading" | "empty" | "error" | "info";

const toneClasses: Record<PageStateStatus, string> = {
  loading: "border-brand-200 bg-white",
  empty: "border-neutral-200 bg-white",
  error: "border-rose-200 bg-rose-50",
  info: "border-neutral-200 bg-white"
};

const iconBackground: Record<PageStateStatus, string> = {
  loading: "bg-brand-100 text-brand-600",
  empty: "bg-neutral-100 text-neutral-500",
  error: "bg-rose-100 text-rose-600",
  info: "bg-neutral-100 text-neutral-500"
};

export type PageStateProps = {
  status?: PageStateStatus;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  illustration?: ReactNode;
  className?: string;
  fullHeight?: boolean;
  children?: ReactNode;
};

export function PageState({
  status = "info",
  title,
  description,
  actions,
  illustration,
  className,
  fullHeight = true,
  children
}: PageStateProps) {
  return (
    <div
      className={classNames(
        "flex w-full items-center justify-center",
        fullHeight ? "min-h-[60vh]" : undefined,
        className
      )}
    >
      <div
        className={classNames(
          "w-full max-w-xl rounded-2xl border p-8 shadow-sm",
          toneClasses[status]
        )}
      >
        <div className="flex items-start gap-4">
          <StateIcon status={status} illustration={illustration} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            {description ? <div className="mt-2 space-y-2 text-sm text-neutral-600">{description}</div> : null}
            {actions ? <div className="mt-4 flex flex-wrap gap-3 text-sm">{actions}</div> : null}
          </div>
        </div>
        {children ? <div className="mt-6 space-y-4">{children}</div> : null}
      </div>
    </div>
  );
}

function StateIcon({ status, illustration }: { status: PageStateStatus; illustration?: ReactNode }) {
  if (illustration) {
    return <div className="h-12 w-12 shrink-0 text-brand-500">{illustration}</div>;
  }

  if (status === "loading") {
    return (
      <div
        className={classNames(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          iconBackground[status]
        )}
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  const label = status === "error" ? "!" : "i";

  return (
    <div
      className={classNames(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold",
        iconBackground[status]
      )}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

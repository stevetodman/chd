import type { ReactNode } from "react";
import { classNames } from "../lib/utils";

const variantStyles = {
  loading: {
    container:
      "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200",
    heading: "text-neutral-900 dark:text-neutral-100",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-neutral-200 border-t-brand-500 align-middle [animation:spin_0.8s_linear_infinite] dark:border-neutral-700 dark:border-t-brand-400"
      />
    )
  },
  error: {
    container:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200",
    heading: "text-rose-700 dark:text-rose-100",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <line x1="12" y1="16" x2="12" y2="16" />
        </svg>
      </span>
    )
  },
  empty: {
    container:
      "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
    heading: "text-neutral-700 dark:text-neutral-100",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 17V5a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <polyline points="14 3 14 9 20 9" />
        </svg>
      </span>
    )
  },
  info: {
    container:
      "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200",
    heading: "text-neutral-800 dark:text-neutral-100",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-200"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="8" />
        </svg>
      </span>
    )
  }
} as const;

type Variant = keyof typeof variantStyles;

type PageStateProps = {
  title: string;
  description?: string;
  variant?: Variant;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  fullHeight?: boolean;
};

export function PageState({
  title,
  description,
  variant = "loading",
  action,
  children,
  className,
  fullHeight = false
}: PageStateProps) {
  const styles = variantStyles[variant];
  const role = variant === "error" ? "alert" : variant === "loading" ? "status" : undefined;
  const live = variant === "loading" ? "polite" : undefined;

  return (
    <section
      className={classNames(
        "flex w-full flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center shadow-sm",
        styles.container,
        fullHeight ? "min-h-[280px]" : "",
        className
      )}
      role={role}
      aria-live={live}
    >
      {styles.icon}
      <div className="space-y-2">
        <h2 className={classNames("text-lg font-semibold", styles.heading)}>{title}</h2>
        {description ? <p className="text-sm text-current opacity-80">{description}</p> : null}
      </div>
      {children}
      {action}
    </section>
  );
}

export default PageState;

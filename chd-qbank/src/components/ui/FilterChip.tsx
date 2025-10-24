import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";

import { classNames } from "../../lib/utils";

type FilterChipTone = "default" | "brand";

type FilterChipProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, "color"> & {
  active?: boolean;
  tone?: FilterChipTone;
  disabled?: boolean;
};

const baseStyles =
  "group inline-flex cursor-pointer items-center gap-3 rounded-full border px-4 py-3 text-sm font-medium transition duration-150 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-300";

const toneStyles: Record<FilterChipTone, { base: string; active: string }> = {
  default: {
    base:
      "border-surface-muted bg-surface-base text-surface-inverted shadow-elevation-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
    active:
      "border-brand-300 bg-brand-50 text-brand-700 shadow-elevation-sm dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-200"
  },
  brand: {
    base:
      "border-brand-200 bg-brand-50/40 text-brand-700 shadow-elevation-xs dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-200",
    active:
      "border-brand-400 bg-brand-100 text-brand-800 shadow-elevation-sm dark:border-brand-400 dark:bg-brand-500/20 dark:text-brand-100"
  }
};

export const FilterChip = forwardRef<HTMLLabelElement, FilterChipProps>(
  ({ className, active = false, tone = "default", disabled = false, children, ...props }, ref) => (
    <label
      ref={ref}
      data-active={active || undefined}
      data-disabled={disabled || undefined}
      className={classNames(
        baseStyles,
        toneStyles[tone].base,
        active ? toneStyles[tone].active : null,
        disabled ? "cursor-not-allowed opacity-60" : null,
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
);

FilterChip.displayName = "FilterChip";

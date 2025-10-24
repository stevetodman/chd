import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { classNames } from "../../lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const baseStyles =
  "h-12 w-full rounded-xl border border-surface-muted bg-surface-base px-4 text-base text-surface-inverted shadow-elevation-xs transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 focus:ring-offset-surface-base disabled:cursor-not-allowed disabled:bg-surface-muted";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select ref={ref} className={classNames(baseStyles, className)} {...props} />
));

Select.displayName = "Select";

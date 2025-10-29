import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base disabled:cursor-not-allowed disabled:opacity-60";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    const variantClasses = {
      primary: "bg-brand-600 text-white shadow-elevation-xs hover:bg-brand-500",
      secondary: "border border-surface-muted bg-surface-base text-surface-inverted shadow-elevation-xs hover:bg-surface-subtle",
      ghost: "bg-transparent text-surface-inverted hover:bg-surface-muted/60"
    }[variant];

    return (
      <button ref={ref} className={classNames(base, variantClasses, className)} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

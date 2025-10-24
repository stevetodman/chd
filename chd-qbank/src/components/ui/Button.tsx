import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { classNames } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-50 shadow-sm transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const variantClasses = {
      primary: "bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 text-white hover:from-brand-500 hover:via-brand-500 hover:to-brand-500",
      secondary: "bg-white/80 text-neutral-900 hover:bg-white",
      ghost: "bg-transparent text-brand-600 hover:bg-brand-50 hover:text-brand-700"
    }[variant];

    return <button ref={ref} className={classNames(base, variantClasses, className)} {...props} />;
  }
);

Button.displayName = "Button";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { classNames } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const base = "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const variantClasses = {
      primary: "bg-brand-600 text-white hover:bg-brand-500",
      secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
      ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100"
    }[variant];

    return <button ref={ref} className={classNames(base, variantClasses, className)} {...props} />;
  }
);

Button.displayName = "Button";

import type { ReactNode } from "react";
import { classNames } from "../../lib/utils";

export type TagTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "info";
export type TagSize = "sm" | "md";

const toneClasses: Record<TagTone, string> = {
  neutral: "bg-surface-muted text-neutral-700 border border-neutral-200",
  brand: "bg-brand-50 text-brand-700 border border-brand-200",
  accent: "bg-accent-50 text-accent-700 border border-accent-200",
  success: "bg-success-50 text-success-700 border border-success-200",
  warning: "bg-warning-50 text-warning-700 border border-warning-200",
  danger: "bg-danger-50 text-danger-700 border border-danger-200",
  info: "bg-brand-50 text-brand-700 border border-brand-200"
};

const sizeClasses: Record<TagSize, string> = {
  sm: "text-xs px-2.5 py-1",
  md: "text-sm px-3 py-1.5"
};

export interface TagProps {
  children: ReactNode;
  tone?: TagTone;
  size?: TagSize;
  icon?: ReactNode;
  className?: string;
  uppercase?: boolean;
}

export function Tag({ children, tone = "neutral", size = "sm", icon, className, uppercase = true }: TagProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-2 rounded-full font-semibold",
        uppercase ? "uppercase tracking-wide" : "tracking-tight",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {icon ? <span className="text-current" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

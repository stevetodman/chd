import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { classNames } from "../../lib/utils";

export type StatTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "info";
export type StatLayout = "vertical" | "horizontal";

const toneStyles: Record<StatTone, { container: string; label: string; value: string; description: string }> = {
  neutral: {
    container: "border-neutral-200 bg-white text-neutral-900",
    label: "text-neutral-500",
    value: "text-neutral-900",
    description: "text-neutral-500"
  },
  brand: {
    container: "border-brand-200 bg-brand-50/80 text-brand-900",
    label: "text-brand-700",
    value: "text-brand-900",
    description: "text-brand-700/80"
  },
  accent: {
    container: "border-accent-200 bg-accent-50/80 text-accent-900",
    label: "text-accent-700",
    value: "text-accent-900",
    description: "text-accent-700/80"
  },
  success: {
    container: "border-success-200 bg-success-50 text-success-900",
    label: "text-success-700",
    value: "text-success-900",
    description: "text-success-700/80"
  },
  warning: {
    container: "border-warning-200 bg-warning-50 text-warning-900",
    label: "text-warning-700",
    value: "text-warning-900",
    description: "text-warning-700/80"
  },
  danger: {
    container: "border-danger-200 bg-danger-50 text-danger-900",
    label: "text-danger-700",
    value: "text-danger-900",
    description: "text-danger-700/80"
  },
  info: {
    container: "border-brand-200 bg-brand-50 text-brand-900",
    label: "text-brand-700",
    value: "text-brand-900",
    description: "text-brand-700/80"
  }
};

export interface StatTileProps<Component extends ElementType = "div"> {
  as?: Component;
  className?: string;
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  tone?: StatTone;
  layout?: StatLayout;
  trend?: ReactNode;
  icon?: ReactNode;
  interactive?: boolean;
}

export function StatTile<Component extends ElementType = "div">({
  as,
  className,
  label,
  value,
  description,
  tone = "neutral",
  layout = "vertical",
  trend,
  icon,
  interactive = false,
  ...rest
}: StatTileProps<Component> & Omit<ComponentPropsWithoutRef<Component>, keyof StatTileProps<Component>>) {
  const ComponentTag = (as ?? "div") as ElementType;
  const toneClass = toneStyles[tone];

  return (
    <ComponentTag
      className={classNames(
        "relative overflow-hidden rounded-2xl border p-4 shadow-elevation-xs transition",
        interactive ? "hover:shadow-elevation-sm focus-visible:shadow-elevation-sm" : "",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
        toneClass.container,
        className
      )}
      {...(rest as never)}
    >
      <div
        className={classNames(
          "flex w-full gap-3",
          layout === "horizontal" ? "flex-col sm:flex-row sm:items-center sm:justify-between" : "flex-col"
        )}
      >
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-lg" aria-hidden="true">{icon}</span> : null}
            <span className={classNames("text-xs font-semibold uppercase tracking-wide", toneClass.label)}>{label}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={classNames("text-2xl font-semibold", toneClass.value)}>{value}</span>
            {trend ? <span className="text-xs font-medium text-neutral-600">{trend}</span> : null}
          </div>
        </div>
        {layout === "horizontal" && description ? (
          <div className={classNames("text-sm", toneClass.description)}>{description}</div>
        ) : null}
      </div>
      {layout === "vertical" && description ? (
        <p className={classNames("mt-3 text-xs", toneClass.description)}>{description}</p>
      ) : null}
    </ComponentTag>
  );
}

import type { ReactNode } from "react";
import { classNames } from "../../lib/utils";
import { Tag, type TagProps } from "./Tag";

export type SectionHeaderAlign = "start" | "center";
export type SectionHeaderSpacing = "comfortable" | "compact";

type EyebrowTagProps = Omit<TagProps, "children"> & { label: ReactNode };

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode | EyebrowTagProps;
  actions?: ReactNode;
  align?: SectionHeaderAlign;
  spacing?: SectionHeaderSpacing;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  actions,
  align = "start",
  spacing = "comfortable",
  className
}: SectionHeaderProps) {
  const stackClasses = spacing === "comfortable" ? "gap-3" : "gap-2";
  const titleSpacing = spacing === "comfortable" ? "space-y-2" : "space-y-1";
  const alignClasses = align === "center" ? "text-center" : "text-left";
  const layoutClasses = align === "center" ? "items-center" : "items-start";

  const eyebrowNode =
    eyebrow && typeof eyebrow === "object" && "label" in eyebrow ? (
      <Tag {...(eyebrow as EyebrowTagProps)}>{(eyebrow as EyebrowTagProps).label}</Tag>
    ) : (
      eyebrow
    );

  return (
    <div className={classNames("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className={classNames("flex flex-col", stackClasses, layoutClasses, alignClasses)}>
        {eyebrowNode ? <div>{eyebrowNode}</div> : null}
        <div className={classNames(alignClasses, titleSpacing)}>
          <h2 className="text-lg font-semibold text-neutral-900 sm:text-xl">{title}</h2>
          {description ? <p className="text-sm text-neutral-600 sm:text-base">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-shrink-0 items-start gap-2">{actions}</div> : null}
    </div>
  );
}

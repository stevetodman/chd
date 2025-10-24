import { forwardRef } from "react";
import { classNames } from "../../lib/utils";

type CardElevation = "flat" | "raised";

type CardStatus = "default" | "success" | "info" | "warning";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  elevation?: CardElevation;
  status?: CardStatus;
  interactive?: boolean;
};

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const elevationStyles: Record<CardElevation, string> = {
  flat: "shadow-none",
  raised: "shadow-sm"
};

const statusStyles: Record<CardStatus, string> = {
  default: "border-neutral-200 bg-white",
  success: "border-emerald-200 bg-emerald-50/60",
  info: "border-sky-200 bg-sky-50/70",
  warning: "border-amber-200 bg-amber-50/70"
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = "raised", status = "default", interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={classNames(
        "group relative rounded-2xl border transition-all duration-200",
        elevationStyles[elevation],
        statusStyles[status],
        interactive ? "hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-900/10" : null,
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames("border-b border-black/5 px-6 py-4", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={classNames("text-lg font-semibold tracking-tight text-neutral-900", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames("px-6 py-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames("border-t border-black/5 px-6 py-4", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(({ className, ...props }, ref) => (
  <p ref={ref} className={classNames("text-sm text-neutral-500", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

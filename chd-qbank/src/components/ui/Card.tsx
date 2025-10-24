import { forwardRef } from "react";
import { classNames } from "../../lib/utils";

type CardElevation = "flat" | "raised";

type CardStatus = "default" | "success" | "info" | "warning" | "danger";

type CardVariant = "primary" | "secondary";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  elevation?: CardElevation;
  status?: CardStatus;
  variant?: CardVariant;
  interactive?: boolean;
};

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const elevationStyles: Record<CardElevation, string> = {
  flat: "shadow-none",
  raised: "shadow-elevation-xs"
};

const variantStyles: Record<CardVariant, string> = {
  primary: "border-surface-muted bg-surface-base",
  secondary: "border-transparent bg-surface-subtle"
};

const statusStyles: Record<CardStatus, string> = {
  default: "",
  success: "border-success-200 bg-success-50",
  info: "border-brand-200 bg-brand-50",
  warning: "border-warning-200 bg-warning-50",
  danger: "border-danger-200 bg-danger-50"
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, elevation = "raised", status = "default", variant = "primary", interactive = false, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={classNames(
        "group relative rounded-2xl border transition-all duration-200",
        elevationStyles[elevation],
        variantStyles[variant],
        statusStyles[status],
        interactive
          ? "hover:-translate-y-0.5 hover:shadow-elevation-md focus-within:-translate-y-0.5 focus-within:shadow-elevation-md"
          : null,
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames("border-b border-surface-muted/70 px-6 py-4", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={classNames("text-lg font-semibold tracking-tight text-surface-inverted", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames("px-6 py-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames("border-t border-surface-muted/70 px-6 py-4", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(({ className, ...props }, ref) => (
  <p ref={ref} className={classNames("text-sm text-neutral-500", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

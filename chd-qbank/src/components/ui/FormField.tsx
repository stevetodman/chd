import { forwardRef } from 'react';
import type { FieldsetHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';

import { classNames } from '../../lib/utils';

type FieldProps = LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  hint?: ReactNode;
};

export const FormField = forwardRef<HTMLLabelElement, FieldProps>(
  ({ className, label, hint, children, ...props }, ref) => (
    <label
      ref={ref}
      className={classNames('flex flex-col gap-2.5 text-left', className)}
      {...props}
    >
      <span className="text-label-xs uppercase text-neutral-500">{label}</span>
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
      {children}
    </label>
  ),
);

FormField.displayName = 'FormField';

type FieldsetProps = FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  legend: ReactNode;
  description?: ReactNode;
  contentClassName?: string;
};

export const FormFieldset = ({
  className,
  legend,
  description,
  contentClassName,
  children,
  ...props
}: FieldsetProps) => (
  <fieldset
    className={classNames(
      'rounded-2xl border border-surface-muted bg-surface-base/70 px-5 py-4',
      className,
    )}
    {...props}
  >
    <legend className="px-2 text-label-xs uppercase text-neutral-500">{legend}</legend>
    {description ? <p className="mt-2 text-xs text-neutral-500">{description}</p> : null}
    <div className={classNames('mt-4 grid gap-3', contentClassName)}>{children}</div>
  </fieldset>
);

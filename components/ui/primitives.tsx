import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared UI primitives. Kept small and accessible by default: real <button>
 * and <label> elements, visible focus rings from globals.css, and 44px minimum
 * touch targets on interactive controls.
 */

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-55 min-h-11 px-4 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-contrast hover:opacity-90',
        secondary: 'border border-border-strong bg-surface-raised text-text hover:bg-surface-sunken',
        ghost: 'text-text hover:bg-surface-sunken',
        danger: 'bg-danger text-accent-contrast hover:opacity-90',
      },
      size: {
        default: '',
        sm: 'min-h-9 px-3 text-xs',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-(--radius-card) border border-border bg-surface-raised p-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold tracking-tight', className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-text placeholder:text-text-muted',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-border-strong bg-surface-raised p-3 text-sm text-text placeholder:text-text-muted',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'min-h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-text',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('block text-xs font-medium text-text-muted', className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint !== undefined && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4',
  {
    variants: {
      tone: {
        neutral: 'border-border-strong text-text-muted',
        accent: 'border-accent text-accent',
        positive: 'border-positive text-positive',
        warning: 'border-warning text-warning',
        danger: 'border-danger text-danger',
        starter: 'border-starter text-starter',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Explains an empty state and offers the next action. Never fabricates data. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-(--radius-card) border border-dashed border-border-strong p-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-prose text-sm text-text-muted">{description}</p>
      {action !== undefined && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-sunken', className)}
    />
  );
}

/** Names the failing source and keeps the rest of the page usable. */
export function ErrorNotice({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className="rounded-(--radius-card) border border-danger p-4">
      <p className="text-sm font-semibold text-danger">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{detail}</p>
      {action !== undefined && <div className="mt-3">{action}</div>}
    </div>
  );
}

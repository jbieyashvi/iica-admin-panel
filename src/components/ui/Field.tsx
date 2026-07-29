import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
        {required && <span className="ml-0.5 text-magenta-600">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-charcoal-muted">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('input-base', props.className)} />;
}

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-sm text-charcoal transition focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500/20',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-lg border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-muted/60 transition focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500/20',
        props.className,
      )}
    />
  );
}

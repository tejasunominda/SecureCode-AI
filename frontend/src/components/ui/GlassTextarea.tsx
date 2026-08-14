import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id ?? props.name ?? `textarea-${props.placeholder?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary",
            "placeholder:text-text-muted resize-y min-h-[80px]",
            "transition-colors duration-base focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
            error ? "border-danger focus:border-danger" : "focus:border-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-xs text-danger">{error}</p>
        ) : hint ? (
          <p id={`${textareaId}-hint`} className="text-xs text-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

GlassTextarea.displayName = "GlassTextarea";

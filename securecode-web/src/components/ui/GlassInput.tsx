import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Standard text input surface. Error/hint slots are wired up here so form
 * components (react-hook-form + zod) never need to hand-roll validation
 * styling per field.
 */
export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const inputId = id ?? props.name ?? `input-${props.placeholder?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary",
            "placeholder:text-text-muted",
            "transition-colors duration-base focus:outline-none",
            error
              ? "border-danger focus:border-danger"
              : "focus:border-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        >
          {children}
        </input>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

GlassInput.displayName = "GlassInput";

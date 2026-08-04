import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type GlassButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type GlassButtonSize = "sm" | "md" | "lg";

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<GlassButtonVariant, string> = {
  primary:
    "bg-accent text-accent-text shadow-sm hover:bg-accent-hover active:bg-accent-hover",
  secondary:
    "border border-border bg-surface text-text-primary hover:bg-surface-hover active:bg-surface-active",
  ghost:
    "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
  danger:
    "border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10",
};

const sizeClasses: Record<GlassButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * Primary interactive control for the whole app. Variants/sizes are the
 * only allowed customization axes — do not add one-off className overrides
 * for glass surface properties on call sites; extend the tokens instead.
 */
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium",
          "transition-colors duration-base focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

GlassButton.displayName = "GlassButton";

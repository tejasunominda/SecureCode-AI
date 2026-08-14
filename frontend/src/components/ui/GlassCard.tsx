import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Applies the stronger blur/border variant used for modals/overlays. */
  strong?: boolean;
  /** Removes the hover-lift interaction (for static, non-interactive cards). */
  static?: boolean;
}

/**
 * Base "liquid glass" surface. All blur/opacity/border/shadow values come
 * from the design tokens in tailwind.config.ts / src/styles/tokens.css —
 * never hardcoded here.
 */
export function GlassCard({
  className,
  strong = false,
  static: isStatic = false,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-subtle bg-surface shadow-sm",
        strong && "shadow-lg",
        !isStatic && "transition-colors duration-base hover:bg-surface-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type GlassBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface GlassBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: GlassBadgeTone;
}

const toneClasses: Record<GlassBadgeTone, string> = {
  neutral: "border-border bg-surface-2 text-text-secondary",
  success: "border-success/20 bg-success-bg text-success",
  warning: "border-warning/20 bg-warning-bg text-warning",
  danger: "border-danger/20 bg-danger-bg text-danger",
  info: "border-accent/20 bg-accent-light text-accent",
};

/**
 * Compact status pill used for role labels, session status, risk level,
 * and the mandatory BROWSER / DESKTOP_CLIENT_REQUIRED capability tags
 * (PRD FR-PROC-13). Tone is the only visual customization axis.
 */
export function GlassBadge({ className, tone = "neutral", children, ...props }: GlassBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

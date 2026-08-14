import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { GlassProgress } from "./GlassProgress";
import { cn } from "@/lib/cn";

export interface GlassStatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  progress?: { value: number; max?: number; tone?: "default" | "success" | "warning" | "danger" };
  subtitle?: string;
  className?: string;
}

export function GlassStatCard({
  label,
  value,
  icon,
  trend,
  progress,
  subtitle,
  className,
}: GlassStatCardProps) {
  return (
    <GlassCard static className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
        </div>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-danger",
            )}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
          <span className="text-xs text-text-muted">vs last period</span>
        </div>
      )}
      {progress && (
        <div className="mt-3">
          <GlassProgress
            value={progress.value}
            max={progress.max ?? 100}
            tone={progress.tone ?? "default"}
            showValue
          />
        </div>
      )}
    </GlassCard>
  );
}

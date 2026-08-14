import { cn } from "@/lib/cn";

export interface GlassProgressProps {
  value: number;
  max?: number;
  label?: string;
  tone?: "default" | "success" | "warning" | "danger";
  showValue?: boolean;
  className?: string;
}

const toneClasses = {
  default: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function GlassProgress({
  value,
  max = 100,
  label,
  tone = "default",
  showValue = false,
  className,
}: GlassProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
          {showValue && <span className="text-xs text-text-muted">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all duration-300", toneClasses[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

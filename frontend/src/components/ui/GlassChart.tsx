import { cn } from "@/lib/cn";

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface GlassBarChartProps {
  data: BarChartData[];
  height?: number;
  showValues?: boolean;
  className?: string;
}

export function GlassBarChart({ data, height = 200, showValues = true, className }: GlassBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            {showValues && (
              <span className="text-[10px] font-medium text-text-muted">{d.value}</span>
            )}
            <div
              className="w-full rounded-t transition-all duration-300 hover:opacity-80"
              style={{
                height: `${(d.value / max) * (height - 40)}px`,
                minHeight: "4px",
                backgroundColor: d.color ?? "var(--color-accent, #3b82f6)",
              }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="truncate text-[10px] text-text-muted" style={{ maxWidth: "60px" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface LineChartData {
  label: string;
  value: number;
}

export interface GlassLineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  className?: string;
}

export function GlassLineChart({ data, height = 200, color = "#3b82f6", className }: GlassLineChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const width = 100;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - 30 - ((d.value - min) / range) * (height - 50);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * width;
          const y = height - 30 - ((d.value - min) / range) * (height - 50);
          return <circle key={i} cx={x} cy={y} r="0.8" fill={color} />;
        })}
      </svg>
      <div className="flex justify-between px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] text-text-muted">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export interface DonutChartData {
  label: string;
  value: number;
  color?: string;
}

export function GlassDonutChart({ data, size = 160, className }: { data: DonutChartData[]; size?: number; className?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width={size} height={size} className="flex-shrink-0">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-2, #1a1a2e)" strokeWidth="16" />
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color ?? colors[i % colors.length]}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return circle;
        })}
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-text-primary text-lg font-bold">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded"
              style={{ backgroundColor: d.color ?? colors[i % colors.length] }}
            />
            <span className="text-xs text-text-secondary">{d.label}</span>
            <span className="text-xs font-medium text-text-primary">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

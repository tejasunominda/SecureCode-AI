import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface GlassTab {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface GlassTabsProps {
  tabs: GlassTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function GlassTabs({ tabs, value, onChange, className }: GlassTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-accent text-accent-text shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

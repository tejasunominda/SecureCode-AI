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
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      onChange(tabs[nextIndex].value);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Content tabs"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 p-1",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
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

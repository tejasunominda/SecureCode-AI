import { cn } from "@/lib/cn";

export interface GlassCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function GlassCheckbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: GlassCheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label || undefined}
        className="mt-0.5 h-4 w-4 rounded border-border accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
      />
      {(label || description) && (
        <div>
          {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
          {description && <p className="text-xs text-text-muted">{description}</p>}
        </div>
      )}
    </label>
  );
}

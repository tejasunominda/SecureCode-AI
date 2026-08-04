import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useToastStore, type ToastTone } from "./useToastStore";

const toneClasses: Record<ToastTone, string> = {
  success: "border-success/20 text-success",
  warning: "border-warning/20 text-warning",
  danger: "border-danger/20 text-danger",
  info: "border-accent/20 text-accent",
};

const AUTO_DISMISS_MS = 5000;

/**
 * Mount once near the app root. Toasts are pushed via the `toast` helper
 * (useToastStore.ts) from anywhere — no prop drilling required.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} title={t.title} description={t.description} tone={t.tone} onDismiss={dismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastItem({
  id,
  title,
  description,
  tone,
  onDismiss,
}: {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        "rounded-md border bg-surface p-4 shadow-lg",
        toneClasses[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="text-text-muted hover:text-text-primary"
          aria-label="Dismiss notification"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

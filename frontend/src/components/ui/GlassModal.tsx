import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";

export interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Portal-rendered dialog with the strong-blur glass surface. Closes on
 * Escape and backdrop click; caller owns open/close state (no internal
 * state machine) to keep it trivially controllable from forms/flows.
 *
 * WCAG 2.1 AA: implements focus trap, restores focus on close, and
 * manages aria attributes for screen readers.
 */
export function GlassModal({ open, onClose, title, children, className }: GlassModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div ref={dialogRef}>
      <GlassCard
        strong
        static
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "glass-modal-title" : undefined}
        aria-label={title || "Dialog"}
        className={cn("w-full max-w-lg p-6", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="glass-modal-title" className="mb-4 text-lg font-semibold text-text-primary">
            {title}
          </h2>
        )}
        {children}
      </GlassCard>
      </div>
    </div>,
    document.body,
  );
}

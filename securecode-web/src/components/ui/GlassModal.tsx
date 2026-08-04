import { useEffect, type ReactNode } from "react";
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
 */
export function GlassModal({ open, onClose, title, children, className }: GlassModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <GlassCard
        strong
        static
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "glass-modal-title" : undefined}
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
    </div>,
    document.body,
  );
}

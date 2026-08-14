import { cn } from "@/lib/cn";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface GlassPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function GlassPagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: GlassPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * (pageSize ?? 0) + 1;
  const end = Math.min(page * (pageSize ?? 0), totalItems ?? 0);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-between gap-4", className)}>
      {totalItems != null && pageSize != null && (
        <span className="text-xs text-text-muted">
          Showing {start}–{end} of {totalItems}
        </span>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-30"
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-30"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center">
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="px-1 text-xs text-text-muted">…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "h-8 min-w-8 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
                  p === page
                    ? "bg-accent text-accent-text"
                    : "text-text-secondary hover:bg-surface-hover",
                )}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-30"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-30"
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

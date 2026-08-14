import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface GlassTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface GlassTableProps<T> {
  columns: GlassTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function GlassTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No data to display.",
  className,
}: GlassTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border-subtle bg-surface", className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn("px-4 py-3 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors duration-fast hover:bg-surface-hover">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-text-primary", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

export interface SidebarNavItem {
  to: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  items: SidebarNavItem[];
}

/**
 * Persistent left navigation, rendered inside a clean design system. Route
 * visibility per item is filtered by the caller (App shell) based on the
 * authenticated user's roles, not hardcoded here.
 */
export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border-subtle bg-surface p-4">
      <div className="mb-6 px-2">
        <span className="text-lg font-semibold text-text-primary">SecureCode AI</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-accent text-accent-text"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

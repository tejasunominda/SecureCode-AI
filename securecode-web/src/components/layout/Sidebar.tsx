import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, ClipboardList, FileText, BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SidebarNavItem {
  to: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  items?: SidebarNavItem[];
}

const DEFAULT_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", to: "/app", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "HR Dashboard", to: "/app/hr", icon: <Users className="h-4 w-4" /> },
  { label: "Assessments", to: "/app/assessments", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Sessions", to: "/app/sessions", icon: <FileText className="h-4 w-4" /> },
  { label: "Reports", to: "/app/reports", icon: <BarChart3 className="h-4 w-4" /> },
];

export function Sidebar({ items = DEFAULT_ITEMS }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border-subtle bg-surface">
      <div className="flex h-16 items-center gap-2.5 border-b border-border-subtle px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent shadow-sm">
          <ShieldCheck className="h-5 w-5 text-accent-text" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-text-primary">SecureCode AI</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Hiring Platform</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <div className="mb-2 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Menu
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-base",
                isActive
                  ? "bg-accent text-accent-text shadow-sm"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border-subtle p-4">
        <div className="rounded-md border border-border-subtle bg-surface-2 p-3">
          <p className="text-xs font-medium text-text-secondary">Need help?</p>
          <p className="mt-1 text-[11px] text-text-muted">Check our documentation or contact support.</p>
        </div>
      </div>
    </aside>
  );
}

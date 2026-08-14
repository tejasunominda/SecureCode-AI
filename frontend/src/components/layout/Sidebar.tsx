import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BarChart3, ShieldCheck, BookOpen, Settings, Eye, Building2, FileText, ScrollText } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SidebarNavItem {
  to: string;
  label: string;
  icon?: React.ReactNode;
  roles?: string[];
}

export interface SidebarProps {
  items?: SidebarNavItem[];
  userRoles?: string[];
}

const ALL_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", to: "/app", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "HR Dashboard", to: "/app/hr", icon: <Users className="h-4 w-4" />, roles: ['HR', 'SUPER_ADMIN'] },
  { label: "Question Bank", to: "/app/questions", icon: <BookOpen className="h-4 w-4" />, roles: ['HR', 'SUPER_ADMIN'] },
  { label: "Assessments", to: "/app/assessments", icon: <FileText className="h-4 w-4" />, roles: ['HR', 'SUPER_ADMIN'] },
  { label: "Organization", to: "/app/org", icon: <Building2 className="h-4 w-4" />, roles: ['HR', 'SUPER_ADMIN'] },
  { label: "Proctor Review", to: "/app/proctor", icon: <Eye className="h-4 w-4" />, roles: ['TECHNICAL_MANAGER', 'SUPER_ADMIN'] },
  { label: "Analytics", to: "/app/analytics", icon: <BarChart3 className="h-4 w-4" />, roles: ['TECHNICAL_MANAGER', 'HR', 'SUPER_ADMIN'] },
  { label: "Audit Log", to: "/app/audit", icon: <ScrollText className="h-4 w-4" />, roles: ['HR', 'TECHNICAL_MANAGER', 'SUPER_ADMIN'] },
  { label: "Settings", to: "/app/settings", icon: <Settings className="h-4 w-4" />, roles: ['HR', 'SUPER_ADMIN'] },
];

function filterItemsByRole(items: SidebarNavItem[], roles?: string[]): SidebarNavItem[] {
  if (!roles || roles.length === 0) return items.filter(item => !item.roles);
  const hasSuperAdmin = roles.some(r => r.toUpperCase() === 'SUPER_ADMIN');
  if (hasSuperAdmin) return items;
  return items.filter(item => !item.roles || item.roles.some(r => roles.some(ur => ur.toUpperCase() === r.toUpperCase())));
}

export function Sidebar({ items, userRoles }: SidebarProps) {
  const navItems = items ?? filterItemsByRole(ALL_ITEMS, userRoles);
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
      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-0.5 p-3">
        <div className="mb-2 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Menu
        </div>
        {navItems.map((item) => (
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

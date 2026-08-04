import { Sidebar, type SidebarNavItem } from "./Sidebar";
import { TopNav } from "./TopNav";

const DEFAULT_NAV_ITEMS: SidebarNavItem[] = [
    { label: "Dashboard", to: "/app" },
    { label: "HR Dashboard", to: "/app/hr" },
    { label: "Assessments", to: "/app/assessments" },
    { label: "Sessions", to: "/app/sessions" },
    { label: "Reports", to: "/app/reports" },
];

export interface AppShellProps {
    children?: React.ReactNode;
    navItems?: SidebarNavItem[];
    userEmail?: string;
    onLogout?: () => void;
}

export function AppShell({ children, navItems = DEFAULT_NAV_ITEMS, userEmail, onLogout }: AppShellProps) {
    return (
        <div className="flex h-screen">
            <Sidebar items={navItems} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopNav userEmail={userEmail} onLogout={onLogout} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

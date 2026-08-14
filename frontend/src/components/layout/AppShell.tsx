import { Sidebar, type SidebarNavItem } from "./Sidebar";
import { TopNav } from "./TopNav";

export interface AppShellProps {
  children?: React.ReactNode;
  navItems?: SidebarNavItem[];
  userEmail?: string;
  userRoles?: string[];
  onLogout?: () => void;
}

export function AppShell({ children, navItems, userEmail, userRoles, onLogout }: AppShellProps) {
    return (
        <div className="flex h-screen">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-text"
            >
                Skip to main content
            </a>
            <Sidebar items={navItems} userRoles={userRoles} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopNav userEmail={userEmail} onLogout={onLogout} />
                <main id="main-content" role="main" className="flex-1 overflow-y-auto bg-canvas p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

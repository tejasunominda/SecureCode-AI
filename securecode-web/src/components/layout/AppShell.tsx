import { Sidebar, type SidebarNavItem } from "./Sidebar";
import { TopNav } from "./TopNav";

export interface AppShellProps {
    children?: React.ReactNode;
    navItems?: SidebarNavItem[];
    userEmail?: string;
    onLogout?: () => void;
}

export function AppShell({ children, navItems, userEmail, onLogout }: AppShellProps) {
    return (
        <div className="flex h-screen">
            <Sidebar items={navItems} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopNav userEmail={userEmail} onLogout={onLogout} />
                <main className="flex-1 overflow-y-auto bg-canvas p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

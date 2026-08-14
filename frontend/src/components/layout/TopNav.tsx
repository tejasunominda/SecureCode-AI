import { LogOut, User } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { NotificationBell } from "@/components/NotificationBell";

export interface TopNavProps {
  userEmail?: string;
  onLogout?: () => void;
}

export function TopNav({ userEmail, onLogout }: TopNavProps) {
  return (
    <header role="banner" className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-text-primary">Hiring Assessment Platform</h2>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {userEmail && (
          <div className="flex items-center gap-2.5" aria-label={`Signed in as ${userEmail}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 border border-border-subtle" aria-hidden="true">
              <User className="h-4 w-4 text-text-secondary" />
            </div>
            <span className="text-sm font-medium text-text-secondary">{userEmail}</span>
          </div>
        )}
        {onLogout && (
          <GlassButton variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </GlassButton>
        )}
      </div>
    </header>
  );
}

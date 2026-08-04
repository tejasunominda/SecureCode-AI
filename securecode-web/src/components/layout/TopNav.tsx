import { GlassButton } from "@/components/ui/GlassButton";

export interface TopNavProps {
  userEmail?: string;
  onLogout?: () => void;
}

export function TopNav({ userEmail, onLogout }: TopNavProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        {userEmail && <span className="text-sm text-text-secondary">{userEmail}</span>}
        {onLogout && (
          <GlassButton variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </GlassButton>
        )}
      </div>
    </header>
  );
}

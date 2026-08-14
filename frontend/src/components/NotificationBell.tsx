import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNotifications, type InAppNotification } from '@/hooks/useNotifications';
import { cn } from '@/lib/cn';
import { formatUtcTimestamp } from '@/lib/datetime-utils';

function getNotificationIconColor(type: string): string {
    switch (type) {
        case 'success': return 'text-green-400';
        case 'warning': return 'text-yellow-400';
        case 'error': return 'text-red-400';
        case 'info':
        default: return 'text-accent';
    }
}

function NotificationItem({ notification, onMarkRead }: {
    notification: InAppNotification;
    onMarkRead: (id: string) => void;
}) {
    return (
        <div className={cn(
            'flex flex-col gap-1 rounded-lg border p-3 transition-colors',
            notification.read
                ? 'border-border-subtle bg-surface opacity-60'
                : 'border-border-default bg-surface-2',
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Bell className={cn('h-3.5 w-3.5', getNotificationIconColor(notification.type))} />
                    <span className="text-xs font-medium text-text-primary">{notification.title}</span>
                </div>
                {!notification.read && (
                    <button
                        onClick={() => onMarkRead(notification.id)}
                        className="text-text-muted hover:text-text-primary"
                        title="Mark as read"
                    >
                        <Check className="h-3 w-3" />
                    </button>
                )}
            </div>
            {notification.message && (
                <p className="text-[11px] text-text-muted">{notification.message}</p>
            )}
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">
                    {formatUtcTimestamp(notification.createdAt)}
                </span>
                {notification.linkUrl && (
                    <a
                        href={notification.linkUrl}
                        className="text-[10px] text-accent hover:underline"
                    >
                        View
                    </a>
                )}
            </div>
        </div>
    );
}

export function NotificationBell() {
    const { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        const next = !open;
        setOpen(next);
        if (next && notifications.length === 0) {
            fetchNotifications(false);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={handleToggle}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-text">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-11 z-50 w-80 max-h-96 overflow-hidden rounded-lg border border-border-default bg-canvas shadow-xl">
                    <div className="flex items-center justify-between border-b border-border-subtle p-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Notifications
                        </span>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                                >
                                    <CheckCheck className="h-3 w-3" />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="text-text-muted hover:text-text-primary"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-text-muted">
                                <span className="text-xs">Loading...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                                <Bell className="h-6 w-6 mb-2 opacity-50" />
                                <p className="text-xs">No notifications</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

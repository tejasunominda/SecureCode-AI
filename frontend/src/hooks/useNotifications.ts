import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface InAppNotification {
    id: string;
    userId: string;
    orgId: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    linkUrl: string | null;
    createdAt: string;
    readAt: string | null;
}

interface NotificationPage {
    content: InAppNotification[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await api.get<{ unreadCount: number }>('/api/v1/notifications/in-app/unread-count');
            setUnreadCount(data.unreadCount);
        } catch {
            // silently fail — notification count is non-critical
        }
    }, []);

    const fetchNotifications = useCallback(async (unreadOnly = false) => {
        setLoading(true);
        try {
            const data = await api.get<NotificationPage>(
                `/api/v1/notifications/in-app?page=0&size=20&unreadOnly=${unreadOnly}`,
            );
            setNotifications(data.content);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    const markRead = useCallback(async (notificationId: string) => {
        try {
            await api.put(`/api/v1/notifications/in-app/${notificationId}/read`, {});
            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)),
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            // silently fail
        }
    }, []);

    const markAllRead = useCallback(async () => {
        try {
            await api.put('/api/v1/notifications/in-app/read-all', {});
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30_000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    return {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markRead,
        markAllRead,
    };
}

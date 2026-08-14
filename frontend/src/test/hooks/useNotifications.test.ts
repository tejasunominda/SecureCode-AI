import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '@/lib/api';

const mockApiGet = api.get as ReturnType<typeof vi.fn>;
const mockApiPut = api.put as ReturnType<typeof vi.fn>;

const sampleNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    orgId: 'org-1',
    title: 'Test notification',
    message: 'Test message',
    type: 'info',
    read: false,
    linkUrl: null,
    createdAt: '2025-01-15T10:30:45.000Z',
    readAt: null,
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    orgId: 'org-1',
    title: 'Read notification',
    message: 'Already read',
    type: 'success',
    read: true,
    linkUrl: '/reports/123',
    createdAt: '2025-01-14T08:00:00.000Z',
    readAt: '2025-01-14T09:00:00.000Z',
  },
];

describe('useNotifications', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPut.mockReset();
    localStorage.clear();
    localStorage.setItem('securecode_access_token', 'test-token');
    localStorage.setItem('securecode_user_id', 'user-1');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('fetches unread count on mount', async () => {
    mockApiGet.mockResolvedValue({ unreadCount: 3 });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(3);
    });
  });

  it('fetches notifications when fetchNotifications is called', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve({ unreadCount: 1 });
      }
      return Promise.resolve({
        content: sampleNotifications,
        totalElements: 2,
        totalPages: 1,
        number: 0,
      });
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('handles fetch error gracefully', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it('marks a notification as read', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve({ unreadCount: 1 });
      }
      return Promise.resolve({
        content: sampleNotifications,
        totalElements: 2,
        totalPages: 1,
        number: 0,
      });
    });
    mockApiPut.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(2);

    await act(async () => {
      await result.current.markRead('notif-1');
    });

    expect(result.current.notifications.find(n => n.id === 'notif-1')?.read).toBe(true);
  });

  it('marks all notifications as read', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve({ unreadCount: 1 });
      }
      return Promise.resolve({
        content: sampleNotifications,
        totalElements: 2,
        totalPages: 1,
        number: 0,
      });
    });
    mockApiPut.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.notifications.every(n => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('handles empty notification list', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve({ unreadCount: 0 });
      }
      return Promise.resolve({
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
      });
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});

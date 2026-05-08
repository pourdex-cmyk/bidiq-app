import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/v1/notifications');
      setNotifications(res.data.data || []);
    } catch {
      // silently ignore — not authenticated yet
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(async (ids: string[]) => {
    setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, is_read: true } : n));
    await api.post('/v1/notifications/mark-read', { ids });
  }, []);

  return { notifications, markRead, refetch: fetchNotifications };
}

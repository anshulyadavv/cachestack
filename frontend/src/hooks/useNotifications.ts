// hooks/useNotifications.ts
// Manages a toast notification queue.
// Notifications auto-dismiss after `duration` ms.
import { useState, useCallback, useRef } from 'react';

export type NotifLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  message: string;
  level: NotifLevel;
  ts: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const counterRef = useRef(0);

  const push = useCallback((message: string, level: NotifLevel = 'info', duration = 5000) => {
    const id = ++counterRef.current;
    const ts = new Date().toTimeString().slice(0, 8);
    setNotifications(prev => [{ id, message, level, ts }, ...prev].slice(0, 20));
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => setNotifications([]), []);

  return { notifications, push, dismiss, dismissAll };
}

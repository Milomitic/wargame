import { create } from "zustand";
import { api } from "../api/client.js";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  isRead: number;
  relatedId: string | null;
  createdAt: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  /** Toast queue — short-lived in-memory popups for new notifications. */
  toasts: Notification[];
  /** Briefly true after a new notification arrives — used to trigger bell ring animation. */
  ringTick: number;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (n: Notification) => void;
  dismissToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  toasts: [],
  ringTick: 0,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      // Only fetch unread — once read, notifications disappear from the inbox
      const data = await api.get<{ notifications: Notification[] }>(
        "/notifications?unread=true"
      );
      set({ notifications: data.notifications, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await api.get<{ count: number }>("/notifications/unread-count");
      set({ unreadCount: data.count });
    } catch {}
  },

  markRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((s) => {
        // Remove read notification from inbox list so it disappears immediately
        const wasUnread = s.notifications.some((n) => n.id === id && !n.isRead);
        return {
          notifications: s.notifications.filter((n) => n.id !== id),
          unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
        };
      });
    } catch {}
  },

  markAllRead: async () => {
    try {
      await api.post("/notifications/read-all");
      set({ notifications: [], unreadCount: 0 });
    } catch {}
  },

  addNotification: (n: Notification) => {
    set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
      toasts: [n, ...s.toasts].slice(0, 3),
      ringTick: s.ringTick + 1,
    }));
  },

  dismissToast: (id: string) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

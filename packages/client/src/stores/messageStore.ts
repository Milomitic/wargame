import { create } from "zustand";
import { api } from "../api/client.js";

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: number;
  parentId: string | null;
  createdAt: number;
  senderName?: string | null;
  senderAvatar?: string | null;
  recipientName?: string | null;
  recipientAvatar?: string | null;
}

export interface SendMessageInput {
  recipient: string;
  subject: string;
  body: string;
  parentId?: string | null;
}

interface MessageState {
  inbox: Message[];
  sent: Message[];
  unreadCount: number;
  loading: boolean;
  fetchInbox: () => Promise<void>;
  fetchSent: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<{ ok: boolean; error?: string }>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  /** Add an incoming message from socket. */
  addIncoming: (msg: Message) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  inbox: [],
  sent: [],
  unreadCount: 0,
  loading: false,

  fetchInbox: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ messages: Message[] }>("/messages");
      set({ inbox: data.messages, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchSent: async () => {
    try {
      const data = await api.get<{ messages: Message[] }>("/messages/sent");
      set({ sent: data.messages });
    } catch {}
  },

  fetchUnreadCount: async () => {
    try {
      const data = await api.get<{ count: number }>("/messages/unread-count");
      set({ unreadCount: data.count });
    } catch {}
  },

  sendMessage: async (input) => {
    try {
      await api.post<{ ok: boolean; id: string }>("/messages", input);
      // Refresh sent list
      await get().fetchSent();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Failed to send message" };
    }
  },

  markRead: async (id: string) => {
    try {
      await api.patch(`/messages/${id}/read`);
      set((s) => ({
        inbox: s.inbox.map((m) => (m.id === id ? { ...m, isRead: 1 } : m)),
        unreadCount: Math.max(
          0,
          s.unreadCount - (s.inbox.find((m) => m.id === id && !m.isRead) ? 1 : 0)
        ),
      }));
    } catch {}
  },

  markAllRead: async () => {
    try {
      await api.post("/messages/read-all");
      set((s) => ({
        inbox: s.inbox.map((m) => ({ ...m, isRead: 1 })),
        unreadCount: 0,
      }));
    } catch {}
  },

  deleteMessage: async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      set((s) => ({
        inbox: s.inbox.filter((m) => m.id !== id),
        sent: s.sent.filter((m) => m.id !== id),
      }));
    } catch {}
  },

  addIncoming: (msg: Message) => {
    set((s) => ({
      inbox: [msg, ...s.inbox],
      unreadCount: s.unreadCount + 1,
    }));
  },
}));

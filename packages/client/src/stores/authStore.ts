import { create } from "zustand";
import { api } from "../api/client.js";

interface PlayerInfo {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAdmin?: boolean;
}

interface AuthState {
  player: PlayerInfo | null;
  isLoading: boolean;
  error: string | null;
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updatePlayer: (patch: Partial<PlayerInfo>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  player: null,
  isLoading: true,
  error: null,

  register: async (data) => {
    set({ error: null });
    try {
      const res = await api.post<{ player: PlayerInfo }>("/auth/register", data);
      set({ player: res.player });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  login: async (login, password) => {
    set({ error: null });
    try {
      const res = await api.post<{ player: PlayerInfo }>("/auth/login", {
        login,
        password,
      });
      set({ player: res.player });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ player: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ player: PlayerInfo }>("/auth/me");
      set({ player: res.player, isLoading: false });
    } catch {
      set({ player: null, isLoading: false });
    }
  },

  updatePlayer: (patch) => {
    set((s) => ({
      player: s.player ? { ...s.player, ...patch } : s.player,
    }));
  },
}));

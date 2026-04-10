import { create } from "zustand";
import { api } from "../api/client.js";

interface PlayerInfo {
  id: string;
  username: string;
  displayName: string;
  email: string;
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
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

  login: async (email, password) => {
    set({ error: null });
    try {
      const res = await api.post<{ player: PlayerInfo }>("/auth/login", {
        email,
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
}));

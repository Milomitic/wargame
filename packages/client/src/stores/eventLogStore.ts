import { create } from "zustand";

export interface GameEvent {
  id: string;
  timestamp: number;
  icon: string;
  text: string;
  type: "info" | "success" | "warning" | "danger";
}

interface EventLogState {
  events: GameEvent[];
  addEvent: (event: Omit<GameEvent, "id" | "timestamp">) => void;
  clearEvents: () => void;
}

let counter = 0;

export const useEventLogStore = create<EventLogState>((set) => ({
  events: [],
  addEvent: (event) =>
    set((state) => ({
      events: [
        { ...event, id: String(++counter), timestamp: Date.now() },
        ...state.events,
      ].slice(0, 100),
    })),
  clearEvents: () => set({ events: [] }),
}));

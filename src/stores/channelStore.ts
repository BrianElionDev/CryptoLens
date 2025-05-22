import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ChannelState {
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  toggleChannel: (channel: string) => void;
  reset: () => void;
}

// Create a safe storage that checks if window is available
const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.error("Failed to get from localStorage:", error);
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.error("Failed to set to localStorage:", error);
    }
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error("Failed to remove from localStorage:", error);
    }
  },
};

const defaultState = { selectedChannels: [] };

export const useChannelStore = create<ChannelState>()(
  persist(
    (set) => ({
      ...defaultState,
      setSelectedChannels: (channels) => set({ selectedChannels: channels }),
      toggleChannel: (channel) =>
        set((state) => ({
          selectedChannels: state.selectedChannels.includes(channel)
            ? state.selectedChannels.filter((c) => c !== channel)
            : [...state.selectedChannels, channel],
        })),
      reset: () => set(defaultState),
    }),
    {
      name: "channel-state",
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

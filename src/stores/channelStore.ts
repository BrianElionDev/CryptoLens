import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChannelState {
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  toggleChannel: (channel: string) => void;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set) => ({
      selectedChannels: [],
      setSelectedChannels: (channels) => set({ selectedChannels: channels }),
      toggleChannel: (channel) =>
        set((state) => ({
          selectedChannels: state.selectedChannels.includes(channel)
            ? state.selectedChannels.filter((c) => c !== channel)
            : [...state.selectedChannels, channel],
        })),
    }),
    {
      name: "channel-state",
    }
  )
);

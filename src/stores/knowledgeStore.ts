import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type DateFilterType = "all" | "today" | "week" | "month" | "year";
type SortByType = "date" | "title" | "channel";

interface KnowledgeState {
  searchTerm: string;
  filterChannel: string;
  dateFilter: DateFilterType;
  sortBy: SortByType;
  currentPage: number;
  setSearchTerm: (term: string) => void;
  setFilterChannel: (channel: string) => void;
  setDateFilter: (filter: DateFilterType) => void;
  setSortBy: (sort: SortByType) => void;
  setCurrentPage: (page: number) => void;
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

// Default state
const defaultState = {
  searchTerm: "",
  filterChannel: "all",
  dateFilter: "all",
  sortBy: "date",
  currentPage: 1,
};

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set) => ({
      ...defaultState,
      setSearchTerm: (term) => set({ searchTerm: term }),
      setFilterChannel: (channel) => set({ filterChannel: channel }),
      setDateFilter: (filter) => set({ dateFilter: filter }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setCurrentPage: (page) => set({ currentPage: page }),
      reset: () => set(defaultState),
    }),
    {
      name: "knowledge-filters",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        filterChannel: state.filterChannel,
        dateFilter: state.dateFilter,
        sortBy: state.sortBy,
      }),
    }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set) => ({
      searchTerm: "",
      filterChannel: "all",
      dateFilter: "all",
      sortBy: "date",
      currentPage: 1,
      setSearchTerm: (term) => set({ searchTerm: term }),
      setFilterChannel: (channel) => set({ filterChannel: channel }),
      setDateFilter: (filter) => set({ dateFilter: filter }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setCurrentPage: (page) => set({ currentPage: page }),
    }),
    {
      name: "knowledge-filters",
    }
  )
);

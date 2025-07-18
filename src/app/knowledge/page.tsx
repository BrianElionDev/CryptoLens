"use client";

import { useEffect, Suspense, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import KnowledgeBase from "@/components/KnowledgeBase";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { useContextKnowledge } from "@/hooks/useContextKnowledge";
import { useCoinData } from "@/hooks/useCoinData";
import { KnowledgeItem } from "@/types/knowledge";

type DateFilterType = "all" | "today" | "week" | "month" | "year";
type SortByType = "date" | "title" | "channel";

const PageSkeleton = () => (
  <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative overflow-hidden">
    {/* Background Animation */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -inset-[10px] opacity-50">
        <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
    </div>

    {/* Sticky Header Skeleton */}
    <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col space-y-4">
          {/* Top Bar Skeleton */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-48 bg-gray-700/50 rounded animate-pulse" />
              <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse" />
            </div>
          </div>

          {/* Controls Bar Skeleton */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-10 bg-gray-700/50 rounded animate-pulse" />
            <div className="w-48 h-10 bg-gray-700/50 rounded animate-pulse" />
            <div className="w-32 h-10 bg-gray-700/50 rounded animate-pulse" />
            <div className="w-20 h-10 bg-gray-700/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </header>

    {/* Main Content Skeleton */}
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm p-4"
            >
              <div className="space-y-3">
                <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-700/50 rounded animate-pulse" />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="h-4 w-20 bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-700/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

const KnowledgeBaseWithPagination = ({
  items,
  currentPage,
  itemsPerPage,
  isLoading,
  onPrevPage,
  onNextPage,
  onPageSelect,
}: {
  items: KnowledgeItem[];
  currentPage: number;
  itemsPerPage: number;
  isLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageSelect: (page: number) => void;
}) => {
  return (
    <>
      <KnowledgeBase
        items={items.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        )}
        isMatching={isLoading}
      />

      {/* Pagination */}
      {items.length > itemsPerPage && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:items-center sm:gap-4 w-full">
          <div className="flex flex-row gap-2 w-full sm:w-auto justify-center">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-900/80 backdrop-blur-sm text-gray-200 hover:text-white transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
            >
              <svg
                className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Previous</span>
            </button>

            <button
              onClick={onNextPage}
              disabled={currentPage === Math.ceil(items.length / itemsPerPage)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-900/80 backdrop-blur-sm text-gray-200 hover:text-white transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
            >
              <span>Next</span>
              <svg
                className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-row flex-wrap gap-2 w-full sm:w-auto justify-center">
            {Array.from({
              length: Math.ceil(items.length / itemsPerPage),
            }).map((_, i) => (
              <button
                key={i}
                onClick={() => onPageSelect(i + 1)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 text-sm font-medium ${
                  currentPage === i + 1
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20"
                    : "bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:text-white border border-blue-500/30 hover:border-blue-400/50"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const KnowledgePageContent = memo(function KnowledgePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: knowledge = [],
    isLoading: isKnowledgeLoading,
    error: knowledgeError,
  } = useContextKnowledge();

  // Use useCoinData with an empty array to get all coins
  const { isLoading: isCoinsLoading, isError: coinsError } = useCoinData(
    [],
    0,
    "full"
  );

  useEffect(() => {
    if (isKnowledgeLoading) {
      console.log("Fetching knowledge data...");
    }
    if (isCoinsLoading) {
      console.log("Fetching coin data...");
    }
  }, [isKnowledgeLoading, isCoinsLoading]);

  const itemsPerPage = 99;

  const {
    searchTerm,
    filterChannel,
    dateFilter,
    sortBy,
    currentPage,
    setSearchTerm,
    setFilterChannel,
    setDateFilter,
    setSortBy,
    setCurrentPage,
  } = useKnowledgeStore();

  // Initialize from URL params on first load
  useEffect(() => {
    const search = searchParams.get("search");
    const channel = searchParams.get("channel");
    const date = searchParams.get("date");
    const sort = searchParams.get("sort");
    const page = searchParams.get("page");

    if (search) setSearchTerm(search);
    if (channel) setFilterChannel(channel);
    if (date && ["all", "today", "week", "month", "year"].includes(date)) {
      setDateFilter(date as DateFilterType);
    }
    if (sort && ["date", "title", "channel"].includes(sort)) {
      setSortBy(sort as SortByType);
    }
    if (page) setCurrentPage(Number(page));
  }, [searchParams, setSearchTerm, setFilterChannel, setDateFilter, setSortBy, setCurrentPage]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (searchTerm) {
      params.set("search", searchTerm);
    } else {
      params.delete("search");
    }

    if (filterChannel !== "all") {
      params.set("channel", filterChannel);
    } else {
      params.delete("channel");
    }

    if (dateFilter !== "all") {
      params.set("date", dateFilter);
    } else {
      params.delete("date");
    }

    if (sortBy !== "date") {
      params.set("sort", sortBy);
    } else {
      params.delete("sort");
    }

    if (currentPage !== 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }

    const newUrl = `${window.location.pathname}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    // Only update URL if it's different from current
    if (newUrl !== window.location.href) {
      router.replace(newUrl, { scroll: false });
    }
  }, [searchTerm, filterChannel, dateFilter, sortBy, currentPage, searchParams, router]);

  // Get unique channels from the channel name field
  const filteredItems = (knowledge || []).filter((item) => {
    const matchesSearch = item.video_title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesChannel =
      filterChannel === "all" || item["channel name"] === filterChannel;

    // Date filtering
    const itemDate = new Date(item.date);
    let matchesDate = true;

    if (dateFilter !== "all") {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      if (dateFilter === "today") {
        matchesDate = itemDate >= startOfToday;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = itemDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(startOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = itemDate >= monthAgo;
      } else if (dateFilter === "year") {
        const yearAgo = new Date(startOfToday);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        matchesDate = itemDate >= yearAgo;
      }
    }

    return matchesSearch && matchesChannel && matchesDate;
  });

  // Filter and sort items
  const filteredAndSortedItems = filteredItems.sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === "title") {
      return a.video_title.localeCompare(b.video_title);
    }
    if (sortBy === "channel") {
      return (a["channel name"] || "").localeCompare(b["channel name"] || "");
    }
    return 0;
  });

  // Fix the pagination button handlers
  const handlePrevPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const handleNextPage = () =>
    setCurrentPage(
      Math.min(
        Math.ceil(filteredAndSortedItems.length / itemsPerPage),
        currentPage + 1
      )
    );

  const isLoading = isKnowledgeLoading || isCoinsLoading;
  const error = knowledgeError
    ? typeof knowledgeError === "string"
      ? knowledgeError
      : "Failed to fetch knowledge data"
    : coinsError
    ? "Failed to fetch coin data"
    : null;

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <KnowledgeBaseWithPagination
        items={filteredAndSortedItems}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        isLoading={isLoading}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onPageSelect={setCurrentPage}
      />
    </main>
  );
});

export default function KnowledgePage() {
  const {
    searchTerm,
    filterChannel,
    dateFilter,
    sortBy,
    setSearchTerm,
    setFilterChannel,
    setDateFilter,
    setSortBy,
    setCurrentPage,
  } = useKnowledgeStore();

  const { data: knowledge } = useContextKnowledge();

  // Count filtered items for the header
  const filteredCount = (knowledge || []).filter((item) => {
    const matchesSearch = item.video_title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesChannel =
      filterChannel === "all" || item["channel name"] === filterChannel;

    // Date filtering
    const itemDate = new Date(item.date);
    let matchesDate = true;

    if (dateFilter !== "all") {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      if (dateFilter === "today") {
        matchesDate = itemDate >= startOfToday;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = itemDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(startOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = itemDate >= monthAgo;
      } else if (dateFilter === "year") {
        const yearAgo = new Date(startOfToday);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        matchesDate = itemDate >= yearAgo;
      }
    }

    return matchesSearch && matchesChannel && matchesDate;
  }).length;

  // Get unique channels for filter dropdown
  const channels = Array.from(
    new Set((knowledge || []).map((item) => item["channel name"] || "Unknown"))
  ).sort();

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  Knowledge Base
                </h1>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
                  <span className="text-sm text-gray-400">
                    {knowledge ? filteredCount : "Loading..."} items
                  </span>
                </div>
              </div>
            </div>

            {/* Controls Bar - Responsive: Search on top, filters below */}
            <div className="flex flex-col gap-2">
              {/* Search Row */}
              <div className="relative group w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search knowledge..."
                    className="w-full bg-gray-900/60 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg py-2 pl-10 pr-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 hover:from-blue-600/20 hover:to-purple-600/20"
                  />
                  <svg
                    className="absolute left-3 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              {/* Filters Row - All controls in one row */}
              <div className="flex flex-row gap-2 w-full items-center">
                {/* Channel Filter */}
                <div className="relative w-full max-w-[160px]">
                  <select
                    value={filterChannel}
                    onChange={(e) => {
                      setFilterChannel(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter by channel"
                    className="w-full appearance-none bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 pr-8 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-800/60 transition-colors"
                  >
                    <option value="all">Channels</option>
                    {channels.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {/* Sort Controls */}
                <div className="relative w-full max-w-[140px]">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as SortByType);
                      setCurrentPage(1);
                    }}
                    aria-label="Sort by"
                    className="w-full appearance-none bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-3 pr-8 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-800/60 transition-colors"
                  >
                    <option value="title">Sort by Title</option>
                    <option value="channel">Sort by Channel</option>
                    <option value="date">Sort by Date</option>
                  </select>
                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {/* Filter Button with Modern Hover Menu */}
                <div className="relative group w-full max-w-[90px]">
                  <button className="w-full p-2 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-400 hover:text-gray-300 hover:bg-gray-800/60 transition-colors flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    <span className="text-sm">Filter</span>
                    {dateFilter !== "all" && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </button>
                  <div className="absolute right-0 mt-2 w-64 p-4 bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-lg backdrop-blur-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                          Date Range
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: "all", label: "All Time" },
                            { value: "today", label: "Today" },
                            { value: "week", label: "Last 7 Days" },
                            { value: "month", label: "Last 30 Days" },
                            { value: "year", label: "Last 12 Months" },
                          ].map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-800/60 cursor-pointer group/option"
                            >
                              <input
                                type="radio"
                                name="dateFilter"
                                value={option.value}
                                checked={dateFilter === option.value}
                                onChange={(e) => {
                                  setDateFilter(
                                    e.target.value as DateFilterType
                                  );
                                  setCurrentPage(1);
                                }}
                                className="hidden"
                              />
                              <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover/option:border-blue-400 flex items-center justify-center">
                                {dateFilter === option.value && (
                                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                                )}
                              </div>
                              <span className="ml-3 text-sm text-gray-300 group-hover/option:text-gray-200">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<PageSkeleton />}>
        <KnowledgePageContent />
      </Suspense>
    </div>
  );
}

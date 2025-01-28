"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useKnowledge } from "@/contexts/KnowledgeContext";
import KnowledgeBase from "@/components/KnowledgeBase";
import { KnowledgeItem } from "@/types/knowledge";
import { useKnowledgeStore } from "@/stores/knowledgeStore";

type DateFilterType = "all" | "today" | "week" | "month" | "year";
type SortByType = "date" | "title" | "channel";

export default function KnowledgePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { knowledge, isLoading, error } = useKnowledge();
  const itemsPerPage = 9;
  const [expandedItem, setExpandedItem] = useState<KnowledgeItem | null>(null);

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
  }, [
    searchParams,
    setSearchTerm,
    setFilterChannel,
    setDateFilter,
    setSortBy,
    setCurrentPage,
  ]);

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

    router.push(newUrl, { scroll: false });
  }, [
    searchTerm,
    filterChannel,
    dateFilter,
    sortBy,
    currentPage,
    searchParams,
    router,
  ]);

  // Get unique channels from the channel name field
  const channels = Array.from(
    new Set(knowledge.map((item) => item["channel name"] || "Unknown"))
  ).sort();

  // Filter and sort items
  const filteredAndSortedItems = knowledge
    .filter((item) => {
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
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "title") {
        return a.video_title.localeCompare(b.video_title);
      }
      // Sort by channel
      const channelA = a["channel name"] || "Unknown";
      const channelB = b["channel name"] || "Unknown";
      return channelA.localeCompare(channelB);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative">
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
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Knowledge Base
              </h1>
              <div className="flex items-center space-x-3">
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
                  <span className="text-sm text-gray-400">
                    {filteredAndSortedItems.length} items
                  </span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full">
              <div className="relative group mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search knowledge..."
                    className="w-full bg-gray-900/60 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg py-3 pl-12 pr-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 hover:from-blue-600/20 hover:to-purple-600/20"
                  />
                  <svg
                    className="absolute left-4 w-5 h-5 text-gray-400"
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
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Date Filter */}
              <div className="flex-1 min-w-[200px] relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <select
                  value={dateFilter}
                  onChange={(e) =>
                    setDateFilter(e.target.value as DateFilterType)
                  }
                  className="relative z-10 w-full appearance-none bg-gray-900/60 bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-200 hover:from-green-600/20 hover:to-emerald-600/20"
                >
                  <option value="all" className="bg-gray-900 text-gray-200">
                    All Time
                  </option>
                  <option value="today" className="bg-gray-900 text-gray-200">
                    Today
                  </option>
                  <option value="week" className="bg-gray-900 text-gray-200">
                    Last Week
                  </option>
                  <option value="month" className="bg-gray-900 text-gray-200">
                    Last Month
                  </option>
                  <option value="year" className="bg-gray-900 text-gray-200">
                    Last Year
                  </option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-20">
                  <svg
                    className="w-4 h-4 text-green-400"
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

              {/* Channel Filter */}
              <div className="flex-1 min-w-[200px] relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="relative z-10 w-full appearance-none bg-gray-900/60 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-200 hover:from-purple-600/20 hover:to-pink-600/20"
                >
                  <option value="all" className="bg-gray-900 text-gray-200">
                    All Channels
                  </option>
                  {channels.map((channel) => (
                    <option
                      key={channel}
                      value={channel}
                      className="bg-gray-900 text-gray-200"
                    >
                      {channel}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-20">
                  <svg
                    className="w-4 h-4 text-purple-400"
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

              {/* Sort */}
              <div className="flex-1 min-w-[200px] relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortByType)}
                  className="relative z-10 w-full appearance-none bg-gray-900/60 bg-gradient-to-r from-pink-600/10 to-red-600/10 border border-pink-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400/50 transition-all duration-200 hover:from-pink-600/20 hover:to-red-600/20"
                >
                  <option value="date" className="bg-gray-900 text-gray-200">
                    Sort by Date
                  </option>
                  <option value="title" className="bg-gray-900 text-gray-200">
                    Sort by Title
                  </option>
                  <option value="channel" className="bg-gray-900 text-gray-200">
                    Sort by Channel
                  </option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-20">
                  <svg
                    className="w-4 h-4 text-pink-400"
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KnowledgeBase
          items={filteredAndSortedItems.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          )}
        />

        {/* Pagination */}
        {filteredAndSortedItems.length > itemsPerPage && (
          <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-6 py-3 rounded-xl bg-gray-900/80 backdrop-blur-sm text-gray-200 hover:text-white transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 group"
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

            <div className="flex items-center space-x-2">
              {Array.from({
                length: Math.ceil(filteredAndSortedItems.length / itemsPerPage),
              }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    currentPage === i + 1
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:text-white border border-blue-500/30 hover:border-blue-400/50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={
                currentPage ===
                Math.ceil(filteredAndSortedItems.length / itemsPerPage)
              }
              className="px-6 py-3 rounded-xl bg-gray-900/80 backdrop-blur-sm text-gray-200 hover:text-white transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 group"
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
        )}
      </main>

      {/* Modal */}
      {expandedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setExpandedItem(null)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 border border-gray-700/50 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-gray-900/70 border-b border-gray-700/50 p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    {expandedItem.video_title}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">
                      {expandedItem["channel name"]}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                      {new Date(expandedItem.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedItem(null)}
                  className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Projects Table */}
              <div className="rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800/30">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700/50">
                    <thead>
                      <tr className="bg-gray-800/50">
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Market Cap
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          R-Points
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {[...expandedItem.llm_answer.projects]
                        .sort((a, b) => (b.rpoints || 0) - (a.rpoints || 0))
                        .map((project, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="font-medium text-blue-400">
                                {project.coin_or_project}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="text-emerald-400">
                                {project.marketcap}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="text-purple-400">
                                {project.rpoints}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="px-2.5 py-1 rounded-full bg-gray-700/50 text-gray-300">
                                {project.total_count || 1}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transcript */}
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-gray-300">
                  Transcript
                </h4>
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {expandedItem.transcript}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import KnowledgeBase from "@/components/KnowledgeBase";
import { useKnowledge } from "@/contexts/KnowledgeContext";
import type { KnowledgeItem } from "@/types/knowledge";
import { motion } from "framer-motion";

export default function KnowledgePage() {
  const { knowledge, isLoading, error } = useKnowledge() as {
    knowledge: KnowledgeItem[];
    isLoading: boolean;
    error: string | null;
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "channel">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [timeRange, setTimeRange] = useState("all");

  // Get unique channels from the data
  const channels = useMemo(() => {
    const uniqueChannels = new Set(knowledge.map((item) => item.channel));
    return [
      { value: "all", label: "All Channels" },
      ...Array.from(uniqueChannels).map((channel) => ({
        value: channel,
        label: channel,
      })),
    ];
  }, [knowledge]);

  // Filter and sort the data
  const filteredAndSortedItems = useMemo(() => {
    const filtered = knowledge.filter((item) => {
      const matchesChannel =
        selectedChannel === "all" ? true : item.channel === selectedChannel;
      const matchesSearch = searchTerm
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.channel.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesTimeRange = () => {
        if (timeRange === "all") return true;
        const itemDate = new Date(item.publish_date).getTime();
        const now = new Date().getTime();
        const day = 24 * 60 * 60 * 1000;
        switch (timeRange) {
          case "day":
            return now - itemDate <= day;
          case "week":
            return now - itemDate <= 7 * day;
          case "month":
            return now - itemDate <= 30 * day;
          default:
            return true;
        }
      };

      return matchesChannel && matchesSearch && matchesTimeRange();
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.publish_date).getTime();
        const dateB = new Date(b.publish_date).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortBy === "channel") {
        const channelA = a.channel.toLowerCase();
        const channelB = b.channel.toLowerCase();
        return sortOrder === "asc"
          ? channelA.localeCompare(channelB)
          : channelB.localeCompare(channelA);
      } else {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortOrder === "asc"
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      }
    });
  }, [knowledge, searchTerm, sortBy, sortOrder, selectedChannel, timeRange]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-cyan-200 text-center py-8">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/40 to-pink-600/40 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-gradient-to-r from-cyan-600/40 to-blue-600/40 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/40 to-purple-600/40 rounded-full mix-blend-multiply filter blur-xl"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-cyan-200 hover:text-cyan-100 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back
                </Link>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
                  Knowledge Base
                </h1>
              </div>

              {/* Sort Order Toggle */}
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-cyan-200 hover:text-cyan-100 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
              >
                {sortOrder === "asc" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9M3 12h5m0 0v6m0-6h14"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h5m0 0v6m0-6h14"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-xl border border-blue-500/20 backdrop-blur-sm">
              {/* Search Bar */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search knowledge base..."
                  className="relative z-10 w-full bg-gray-900/60 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 focus:border-blue-400/50 rounded-lg py-3 px-12 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-3 flex items-center z-20">
                  <svg
                    className="w-5 h-5 text-blue-400"
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
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors z-20"
                  >
                    <svg
                      className="w-5 h-5"
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
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="relative z-10 w-full appearance-none bg-gray-900/60 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border border-blue-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 hover:from-cyan-600/20 hover:to-blue-600/20"
                  >
                    {channels.map((channel) => (
                      <option
                        key={channel.value}
                        value={channel.value}
                        className="bg-gray-900 text-gray-200"
                      >
                        {channel.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-20">
                    <svg
                      className="w-4 h-4 text-blue-400"
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

                <div className="flex-1 min-w-[200px] relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="relative z-10 w-full appearance-none bg-gray-900/60 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-200 hover:from-purple-600/20 hover:to-pink-600/20"
                  >
                    <option value="date" className="bg-gray-900 text-gray-200">
                      Sort by Date
                    </option>
                    <option value="title" className="bg-gray-900 text-gray-200">
                      Sort by Title
                    </option>
                    <option
                      value="channel"
                      className="bg-gray-900 text-gray-200"
                    >
                      Sort by Channel
                    </option>
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

                <div className="flex-1 min-w-[200px] relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="relative z-10 w-full appearance-none bg-gray-900/60 bg-gradient-to-r from-pink-600/10 to-purple-600/10 border border-pink-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400/50 transition-all duration-200 hover:from-pink-600/20 hover:to-purple-600/20"
                  >
                    <option value="all" className="bg-gray-900 text-gray-200">
                      All Time
                    </option>
                    <option value="day" className="bg-gray-900 text-gray-200">
                      Last 24 Hours
                    </option>
                    <option value="week" className="bg-gray-900 text-gray-200">
                      Last Week
                    </option>
                    <option value="month" className="bg-gray-900 text-gray-200">
                      Last Month
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <KnowledgeBase items={filteredAndSortedItems} />
      </main>

      {/* Floating Action Button */}
      <Link
        href="/faq"
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 transform hover:scale-110 transition-all duration-300 group animate-pulse-slow"
      >
        <div className="absolute -top-12 right-0 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md rounded-lg border border-blue-500/20 text-cyan-200 text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1">
          Ask Questions
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
          <svg
            className="w-6 h-6 text-white relative z-10 transform group-hover:rotate-12 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </Link>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
        @keyframes gradient-x {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  );
}

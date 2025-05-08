"use client";

import { motion } from "framer-motion";
import { X, Search, ChevronUp, ChevronDown } from "lucide-react";
import type { KnowledgeItem } from "@/types/knowledge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useRef, useEffect } from "react";
import React from "react";
import { useCoinGecko } from "@/contexts/CoinGeckoContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface StatsModalProps {
  item: KnowledgeItem;
  onClose: () => void;
}

export function StatsModal({ item, onClose }: StatsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "stats" | "summary" | "transcript"
  >("stats");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { topCoins, isLoading: isLoadingCoins, matchCoins } = useCoinGecko();

  const validProjects = useMemo(() => {
    if (!topCoins || isLoadingCoins) return [];

    console.debug("Attempting to match coins:", {
      totalProjects: item.llm_answer.projects.length,
      availableCoins: topCoins.length,
      projectNames: item.llm_answer.projects.map((p) => p.coin_or_project),
    });

    return matchCoins(item.llm_answer.projects).filter(
      (p) => p.coingecko_matched
    );
  }, [topCoins, item.llm_answer.projects, isLoadingCoins, matchCoins]);

  const matches = useMemo(() => {
    if (!item.corrected_transcript || !searchQuery) return [];
    const lines = item.corrected_transcript.split("\n");
    const query = searchQuery.toLowerCase();
    let matchCount = 0;
    return lines
      .map((line, index) => {
        const matchesInLine = (
          line.toLowerCase().match(new RegExp(`\\b${query}\\b`, "g")) || []
        ).length;
        const lineMatches =
          matchesInLine > 0
            ? { line, index, count: matchesInLine, startIndex: matchCount }
            : null;
        matchCount += matchesInLine;
        return lineMatches;
      })
      .filter(Boolean);
  }, [item.corrected_transcript, searchQuery]);

  const filteredTranscript = useMemo(() => {
    if (!item.corrected_transcript || !searchQuery)
      return item.corrected_transcript;
    return matches.map((match) => match?.line || "").join("\n");
  }, [item.corrected_transcript, searchQuery, matches]);

  const totalMatches = useMemo(() => {
    return matches.reduce((sum, match) => sum + (match?.count || 0), 0);
  }, [matches]);

  const navigateMatches = (direction: "next" | "prev") => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => {
      const newIndex =
        direction === "next"
          ? (prev + 1) % totalMatches
          : prev <= 0
          ? totalMatches - 1
          : prev - 1;

      // Find which line contains this match
      let cumulativeCount = 0;
      for (const match of matches) {
        if (match) {
          cumulativeCount += match.count;
          if (newIndex < cumulativeCount) {
            setCurrentLineIndex(match.index);
            break;
          }
        }
      }

      return newIndex;
    });
  };

  const highlightText = (text: string, lineIndex: number) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(\\b${searchQuery}\\b)`, "gi"));
    let matchCount = 0;
    return parts.map((part, i) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        const isCurrentMatch =
          lineIndex === currentLineIndex && matchCount === currentMatchIndex;
        matchCount++;
        return (
          <span
            key={i}
            data-highlight="true"
            ref={
              isCurrentMatch
                ? (el) => {
                    if (el && transcriptRef.current) {
                      el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }
                : undefined
            }
            className={`${
              isCurrentMatch
                ? "bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400"
                : "bg-blue-500/20 text-blue-200"
            } px-1 rounded`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    setCurrentMatchIndex(-1);
    setCurrentLineIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentMatchIndex >= 0 && transcriptRef.current) {
      const highlightedElements = transcriptRef.current.querySelectorAll(
        '[data-highlight="true"]'
      );
      if (highlightedElements[currentMatchIndex]) {
        highlightedElements[currentMatchIndex].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentMatchIndex]);

  // Handle navigation to category page
  const handleCategoryClick = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const categoryId = category.toLowerCase().replace(/\s+/g, "-");
    router.push(`/categories/${categoryId}`);
    onClose(); // Close modal after navigation
  };

  const renderLLMAnswer = () => {
    try {
      if (isLoadingCoins) {
        return (
          <div className="mt-4 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading coin data...</p>
          </div>
        );
      }

      const projects = validProjects;

      if (!projects || projects.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 mb-4 text-gray-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 7v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2z" />
                <path d="M16 3v4M8 3v4M3 9h18" />
                <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              No Coin Data Available
            </h3>
            <p className="text-gray-500 max-w-sm">
              There are no coins to analyze in this video yet. Check back later
              for updates.
            </p>
          </div>
        );
      }

      // Sort projects by rpoints in descending order
      const top3Projects = [...projects]
        .sort((a, b) => b.rpoints - a.rpoints)
        .slice(0, 3);

      return (
        <div className="mt-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/30 backdrop-blur-sm">
              <thead className="bg-gray-800/30">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    Coins
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    Market Cap
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    Total Count
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    R Points
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    Categories
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30 bg-gray-800/10">
                {[...projects]
                  .sort((a, b) => Number(b.rpoints) - Number(a.rpoints))
                  .map((project, index) => {
                    const isTopProject = top3Projects.some(
                      (p) => p.coin_or_project === project.coin_or_project
                    );
                    return (
                      <tr
                        key={`${project.coin_or_project}-${index}`}
                        className={`transition-all duration-200 backdrop-blur-sm ${
                          isTopProject
                            ? "bg-blue-900/10"
                            : "hover:bg-gray-700/10"
                        }`}
                      >
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`font-medium ${
                              isTopProject ? "text-blue-200" : "text-gray-300"
                            }`}
                          >
                            {project.coin_or_project}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              project.marketcap === "large"
                                ? "bg-green-900/50 text-green-300 border border-green-500/20"
                                : project.marketcap === "medium"
                                ? "bg-yellow-900/50 text-yellow-300 border border-yellow-500/20"
                                : "bg-red-900/50 text-red-300 border border-red-500/20"
                            } cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                // Store selected category in sessionStorage
                                sessionStorage.setItem(
                                  "selectedMarketCap",
                                  project.marketcap.toLowerCase()
                                );
                              } catch (error) {
                                console.error(
                                  "Failed to set session storage:",
                                  error
                                );
                              }
                              router.push("/marketcap");
                              onClose(); // Close modal after navigation
                            }}
                          >
                            {project.marketcap}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={
                              isTopProject ? "text-blue-200" : "text-gray-300"
                            }
                          >
                            {project.total_count}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={
                              isTopProject ? "text-blue-200" : "text-gray-300"
                            }
                          >
                            {project.rpoints}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {project.category?.map((cat: string, i: number) => (
                              <span
                                key={`${project.coin_or_project}-${cat}-${i}`}
                                className="px-2 py-0.5 rounded-full text-xs bg-gray-900/50 text-gray-300 border border-gray-700/50 cursor-pointer hover:bg-blue-900/30 hover:text-blue-200 hover:border-blue-500/30 transition-colors"
                                onClick={(e) => handleCategoryClick(cat, e)}
                              >
                                {cat}
                              </span>
                            )) || "-"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      );
    } catch {
      return <div>Error rendering LLM answer</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-medium text-cyan-200">
            {item.video_title}
          </h2>
          <div className="flex items-center gap-3">
            {typeof item.usage === "number" && (
              <div className="px-3 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded-md">
                <span className="text-sm font-medium text-emerald-300">
                  ${item.usage.toFixed(8)}
                </span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "stats" | "summary" | "transcript")
          }
          className="w-full"
        >
          <TabsList className="grid w-full max-w-[600px] grid-cols-3 bg-gray-900/50 backdrop-blur-sm">
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              Transcript
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto mt-6">
          {activeTab === "stats" ? (
            renderLLMAnswer()
          ) : activeTab === "summary" ? (
            <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/50">
              <div className="prose prose-invert max-w-none">
                {item.summary ? (
                  (item.summary || "").split("\n").map((paragraph, index) => {
                    // Handle headers with hashes
                    if (paragraph.startsWith("##")) {
                      return (
                        <h2
                          key={`h2-${index}-${paragraph.slice(0, 20)}`}
                          className="text-2xl font-bold text-cyan-200 mb-6 mt-10 first:mt-0 border-b border-gray-700/50 pb-3"
                        >
                          {paragraph.replace(/##/g, "").trim()}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith("###")) {
                      return (
                        <h3
                          key={`h3-${index}-${paragraph.slice(0, 20)}`}
                          className="text-xl font-bold text-blue-300 mb-4 mt-8"
                        >
                          {paragraph.replace(/###/g, "").trim()}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith("####")) {
                      return (
                        <h4
                          key={`h4-${index}-${paragraph.slice(0, 20)}`}
                          className="text-lg font-semibold text-blue-300/90 mb-3 mt-6"
                        >
                          {paragraph.replace(/####/g, "").trim()}
                        </h4>
                      );
                    }
                    // Handle bullet points with bold text
                    if (paragraph.startsWith("•")) {
                      const content = paragraph.replace("•", "").trim();
                      if (content.includes("**")) {
                        return (
                          <div
                            key={`bullet-bold-${index}-${content.slice(0, 20)}`}
                            className="flex items-start space-x-3 mb-4 group"
                          >
                            <span className="text-blue-400 mt-1.5 group-hover:text-blue-300 transition-colors text-lg">
                              •
                            </span>
                            <div className="flex-1">
                              {content
                                .split(/(\*\*.*?\*\*)/g)
                                .map((part, i) => {
                                  if (
                                    part.startsWith("**") &&
                                    part.endsWith("**")
                                  ) {
                                    return (
                                      <strong
                                        key={i}
                                        className="text-cyan-200 font-semibold"
                                      >
                                        {part.slice(2, -2)}
                                      </strong>
                                    );
                                  }
                                  return (
                                    <span key={i} className="text-gray-200">
                                      {part}
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`bullet-${index}-${content.slice(0, 20)}`}
                          className="flex items-start space-x-3 mb-4 group"
                        >
                          <span className="text-blue-400 mt-1.5 group-hover:text-blue-300 transition-colors text-lg">
                            •
                          </span>
                          <p className="text-gray-200 leading-relaxed flex-1">
                            {content}
                          </p>
                        </div>
                      );
                    }
                    // Handle nested bullet points
                    if (paragraph.startsWith("-")) {
                      const content = paragraph.replace("-", "").trim();
                      if (content.includes("**")) {
                        return (
                          <div
                            key={`nested-bullet-bold-${index}-${content.slice(
                              0,
                              20
                            )}`}
                            className="flex items-start space-x-3 mb-3 group ml-6"
                          >
                            <span className="text-blue-400/70 mt-1.5 group-hover:text-blue-300 transition-colors">
                              •
                            </span>
                            <div className="flex-1">
                              {content
                                .split(/(\*\*.*?\*\*)/g)
                                .map((part, i) => {
                                  if (
                                    part.startsWith("**") &&
                                    part.endsWith("**")
                                  ) {
                                    return (
                                      <strong
                                        key={i}
                                        className="text-cyan-200 font-semibold"
                                      >
                                        {part.slice(2, -2)}
                                      </strong>
                                    );
                                  }
                                  return (
                                    <span key={i} className="text-gray-200">
                                      {part}
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`nested-bullet-${index}-${content.slice(0, 20)}`}
                          className="flex items-start space-x-3 mb-3 group ml-6"
                        >
                          <span className="text-blue-400/70 mt-1.5 group-hover:text-blue-300 transition-colors">
                            •
                          </span>
                          <p className="text-gray-200 leading-relaxed flex-1">
                            {content}
                          </p>
                        </div>
                      );
                    }
                    // Handle bold text in regular paragraphs
                    if (paragraph.includes("**")) {
                      return (
                        <p
                          key={`bold-${index}-${paragraph.slice(0, 20)}`}
                          className="text-gray-200 mb-4 leading-relaxed"
                        >
                          {paragraph.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong
                                  key={i}
                                  className="text-cyan-200 font-semibold"
                                >
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return (
                              <span key={i} className="text-gray-200">
                                {part}
                              </span>
                            );
                          })}
                        </p>
                      );
                    }
                    // Regular paragraphs
                    return paragraph ? (
                      <p
                        key={`p-${index}-${paragraph.slice(0, 20)}`}
                        className="text-gray-200 mb-4 leading-relaxed"
                      >
                        {paragraph}
                      </p>
                    ) : null;
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 mb-4 text-gray-500">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No Summary Available
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                      A summary for this video hasn&apos;t been generated yet.
                      Check back later for updates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/50 flex flex-col h-full">
              <div className="sticky top-0 z-10 bg-gray-900/40 backdrop-blur-sm pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700/50 focus:border-blue-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700/50 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  {searchQuery && matches.length > 0 && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        <span className="text-emerald-400">
                          {currentMatchIndex + 1}
                        </span>
                        /{totalMatches} matches
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigateMatches("prev")}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigateMatches("next")}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {item.corrected_transcript ? (
                  <div
                    ref={transcriptRef}
                    className="prose prose-invert max-w-none"
                  >
                    {filteredTranscript ? (
                      filteredTranscript.split("\n").map((line, index) => (
                        <p key={index} className="text-gray-200 mb-2">
                          {highlightText(line, index)}
                        </p>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center">
                        No matches found
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 mb-4 text-gray-500">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No Transcript Available
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                      The transcript for this video hasn&apos;t been generated
                      yet. Check back later for updates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
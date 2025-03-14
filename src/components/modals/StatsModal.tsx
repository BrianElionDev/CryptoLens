"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { KnowledgeItem } from "@/types/knowledge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import React from "react";
import { useCoinGecko } from "@/contexts/CoinGeckoContext";

interface StatsModalProps {
  item: KnowledgeItem;
  onClose: () => void;
}

export function StatsModal({ item, onClose }: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "summary">("stats");
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
                            }`}
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
                                className="px-2 py-0.5 rounded-full text-xs bg-gray-900/50 text-gray-300 border border-gray-700/50"
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

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "stats" | "summary")}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-gray-900/50 backdrop-blur-sm">
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
          </TabsList>
        </Tabs>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto mt-6">
          {activeTab === "stats" ? (
            renderLLMAnswer()
          ) : (
            <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/50">
              <div className="prose prose-invert max-w-none">
                {item.summary ? (
                  (item.summary || "").split("\n").map((paragraph, index) => {
                    // Handle headers
                    if (paragraph.startsWith("###")) {
                      return (
                        <h3
                          key={`h3-${index}-${paragraph.slice(0, 20)}`}
                          className="text-xl font-bold text-cyan-200 mb-4"
                        >
                          {paragraph.replace(/###/g, "").trim()}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith("####")) {
                      return (
                        <h4
                          key={`h4-${index}-${paragraph.slice(0, 20)}`}
                          className="text-lg font-semibold text-blue-300 mb-3"
                        >
                          {paragraph.replace(/####/g, "").trim()}
                        </h4>
                      );
                    }
                    // Handle bullet points
                    if (paragraph.startsWith("-")) {
                      return (
                        <div
                          key={`bullet-${index}-${paragraph.slice(0, 20)}`}
                          className="flex items-start space-x-2 mb-2"
                        >
                          <span className="text-blue-400 mt-1.5">•</span>
                          <p className="text-gray-200">
                            {paragraph.replace("-", "").trim()}
                          </p>
                        </div>
                      );
                    }
                    // Handle bold text
                    if (paragraph.includes("**")) {
                      return (
                        <p
                          key={`bold-${index}-${paragraph.slice(0, 20)}`}
                          className="text-gray-200 mb-2"
                        >
                          {paragraph.split("**").map((part, i) => (
                            <React.Fragment
                              key={`${index}-${i}-${part.slice(0, 10)}`}
                            >
                              {i % 2 === 0 ? (
                                <span>{part}</span>
                              ) : (
                                <strong className="text-cyan-200">
                                  {part}
                                </strong>
                              )}
                            </React.Fragment>
                          ))}
                        </p>
                      );
                    }
                    // Regular paragraphs
                    return paragraph ? (
                      <p
                        key={`p-${index}-${paragraph.slice(0, 20)}`}
                        className="text-gray-200 mb-2"
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
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

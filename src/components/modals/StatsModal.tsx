"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { KnowledgeItem } from "@/types/knowledge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import React from "react";
import { useCoinData } from "@/hooks/useCoinData";

interface StatsModalProps {
  item: KnowledgeItem;
  onClose: () => void;
}

export function StatsModal({ item, onClose }: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "summary">("stats");

  // Get all unique coin symbols
  const coinSymbols = useMemo(
    () =>
      Array.from(
        new Set(
          item.llm_answer.projects.map((p) => p.coin_or_project.toLowerCase())
        )
      ),
    [item.llm_answer.projects]
  );

  // Validate coins against CoinGecko
  const { data: coinData, isLoading: isValidating } = useCoinData(coinSymbols);

  const validProjects = useMemo(() => {
    if (!coinData || isValidating) return item.llm_answer.projects;

    // Debug log
    console.log(
      "CoinGecko Data:",
      coinData.data.map((c) => ({ symbol: c.symbol, name: c.name }))
    );
    console.log(
      "Projects to match:",
      item.llm_answer.projects.map((p) => p.coin_or_project)
    );

    return item.llm_answer.projects.map((project) => {
      const projectName = project.coin_or_project.toLowerCase().trim();

      // Try to find matching coin
      const matchedCoin = coinData.data.find((coin) => {
        const symbol = coin.symbol.toLowerCase().trim();
        const name = coin.name.toLowerCase().trim();

        const isMatch =
          symbol === projectName ||
          name === projectName ||
          projectName.includes(symbol) ||
          symbol.includes(projectName) ||
          name.includes(projectName) ||
          projectName.includes(name);

        if (isMatch) {
          console.log(`Matched: ${projectName} with CoinGecko coin:`, {
            symbol,
            name,
            price: coin.price,
          });
        }

        return isMatch;
      });

      if (!matchedCoin) {
        console.log(`No CoinGecko match for: ${projectName}`);
      }

      return {
        ...project,
        coingecko_matched: !!matchedCoin,
        current_price: matchedCoin?.price,
      };
    });
  }, [coinData, item.llm_answer.projects, isValidating]);

  const renderLLMAnswer = () => {
    try {
      if (isValidating) {
        return (
          <div className="mt-4 flex items-center justify-center p-8">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        );
      }

      const projects = validProjects;

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
                {(item.summary || "").split("\n").map((paragraph, index) => {
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
                              <strong className="text-cyan-200">{part}</strong>
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
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeItem, Project } from "@/types/knowledge";

interface KnowledgeBaseProps {
  items: KnowledgeItem[]; // Pass filtered items directly
}

export default function KnowledgeBase({ items }: KnowledgeBaseProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const renderSortedData = (sortedString: string) => {
    try {
      // Parse the data twice since it's double-stringified
      const data = JSON.parse(JSON.parse(sortedString));

      // Check if we have a valid data structure
      if (!data || !data.projects) {
        console.warn("Invalid data structure:", data);
        return null;
      }

      const { projects, total_count, total_Rpoints } = data;

      const top3Coins = new Set(
        projects
          .sort((a: Project, b: Project) => b.Rpoints - a.Rpoints)
          .slice(0, 3)
          .map((p: Project) => p.Coin)
      );

      return (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Total Mentions: {total_count}</span>
            <span>Total R Points: {total_Rpoints}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    Coin
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    Market Cap
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider">
                    R Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800/20">
                {projects
                  .sort((a: Project, b: Project) => b.Rpoints - a.Rpoints)
                  .map((project: Project, index: number) => {
                    const coinName = project.Coin;
                    const isTopCoin = top3Coins.has(coinName);
                    return (
                      <tr
                        key={index}
                        className={`transition-colors duration-150 ${
                          isTopCoin ? "bg-blue-900/20" : "hover:bg-gray-700/30"
                        }`}
                      >
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {isTopCoin && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs font-medium text-blue-300">
                                {index + 1}
                              </span>
                            )}
                            <span
                              className={`font-medium ${
                                isTopCoin ? "text-blue-200" : "text-gray-300"
                              }`}
                            >
                              {coinName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              project.Marketcap === "large"
                                ? "bg-green-900/50 text-green-300 border border-green-500/20"
                                : "bg-yellow-900/50 text-yellow-300 border border-yellow-500/20"
                            }`}
                          >
                            {project.Marketcap}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isTopCoin ? "bg-blue-500" : "bg-gray-500"
                                }`}
                                style={{
                                  width: `${(project.Rpoints / 10) * 100}%`,
                                }}
                              />
                            </div>
                            <span
                              className={
                                isTopCoin ? "text-blue-200" : "text-gray-300"
                              }
                            >
                              {project.Rpoints}
                            </span>
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
    } catch (error) {
      console.error("Error parsing sorted data:", error);
      return null;
    }
  };

  // Modal component
  const Modal = ({
    item,
    onClose,
  }: {
    item: KnowledgeItem;
    onClose: () => void;
  }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-medium text-cyan-200">{item.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700/30 rounded transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
        {item.sorted && renderSortedData(item.sorted)}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Knowledge Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {currentItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            onClick={() => setExpandedCard(item.id)}
            className="group relative bg-gradient-to-br from-gray-900/90 via-gray-900/50 to-gray-900/90 backdrop-blur-xl rounded-xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-blue-500/20"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-shimmer" />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-pink-500/20 transition-all duration-300" />

            {/* Content */}
            <div className="relative p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-cyan-200 to-purple-300 group-hover:from-blue-200 group-hover:via-cyan-100 group-hover:to-purple-200 transition-all duration-300">
                  {item.title || "Crypto Trading Insights"}
                  </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-200 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-all duration-300">
                    {item.channel}
                  </span>
                  <span className="text-blue-100/60">
                    {new Date(item.publish_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {expandedCard && (
          <Modal
            item={
              items.find((item) => item.id === expandedCard) ?? {
                id: "",
                title: "Crypto Trading Insights",
                channel: "",
                publish_date: "",
              }
            }
            onClose={() => setExpandedCard(null)}
          />
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-gray-800/40 text-cyan-200 hover:text-cyan-100 hover:bg-gray-700/60 transition-all duration-200 border border-gray-700 hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-800/40 text-cyan-200 hover:text-cyan-100 hover:bg-gray-700/60 transition-all duration-200 border border-gray-700 hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

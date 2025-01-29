"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeItem } from "@/types/knowledge";
import { useKnowledge } from "@/contexts/KnowledgeContext";

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
}

export default function KnowledgeBase({ items }: KnowledgeBaseProps) {
  const { expandedCard, setExpandedCard } = useKnowledge();

  const renderLLMAnswer = (llm_answer: KnowledgeItem["llm_answer"]) => {
    try {
      const { projects, total_count, total_rpoints } = llm_answer;

      // Sort projects by rpoints in descending order
      const top3Projects = [...projects]
        .sort((a, b) => b.rpoints - a.rpoints)
        .slice(0, 3);

      return (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between text-sm text-gray-400">
            <div className="flex gap-8">
              <span>Total Coins: {total_count}</span>
              <span className="border-l border-gray-600 pl-8">
                Count: {total_count}
              </span>
              <span className="border-l border-gray-600 pl-8">
                Total R Points: {total_rpoints}
              </span>
            </div>
          </div>
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
                    R Points
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
                        key={index}
                        className={`transition-all duration-200 backdrop-blur-sm ${
                          isTopProject
                            ? "bg-blue-900/10"
                            : "hover:bg-gray-700/10"
                        }`}
                      >
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                isTopProject ? "text-blue-200" : "text-gray-300"
                              }`}
                            >
                              {project.coin_or_project}
                            </span>
                          </div>
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
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isTopProject ? "bg-blue-500" : "bg-gray-500"
                                }`}
                                style={{
                                  width: `${(project.rpoints / 10) * 100}%`,
                                }}
                              />
                            </div>
                            <span
                              className={
                                isTopProject ? "text-blue-200" : "text-gray-300"
                              }
                            >
                              {project.rpoints}
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
      console.error("Error rendering LLM answer:", error);
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
          <h2 className="text-xl font-medium text-cyan-200">
            {item.video_title}
          </h2>
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
        {renderLLMAnswer(item.llm_answer)}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="group cursor-pointer"
          onClick={() => setExpandedCard(item.id)}
        >
          <div className="relative h-48 rounded-xl bg-gradient-to-br from-gray-900/40 to-gray-800/40 border border-gray-700/30 group-hover:border-blue-500/30 transition-all duration-300 overflow-hidden backdrop-blur-md">
            {/* Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/10 to-gray-800/10 backdrop-blur-sm" />
            </div>

            {/* Content */}
            <div className="relative h-full p-6 flex flex-col justify-between z-10">
              <div>
                <div className="text-sm text-blue-400/90 mb-2 backdrop-blur-sm inline-block px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  {item["channel name"]}
                </div>
                <h3 className="text-lg font-semibold text-gray-100 group-hover:text-cyan-200 transition-colors line-clamp-2">
                  {item.video_title}
                </h3>
              </div>

              <div className="flex justify-between items-end">
                <div className="text-sm text-gray-400 backdrop-blur-sm px-2 py-0.5 rounded-full bg-gray-800/30">
                  {new Date(item.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 backdrop-blur-sm px-2 py-0.5 rounded-full bg-gray-800/30">
                  <span>{item.llm_answer.projects.length} Coins</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Modal */}
      <AnimatePresence>
        {expandedCard && (
          <Modal
            item={
              items.find((item) => item.id === expandedCard) ?? {
                id: "",
                video_title: "Crypto Trading Insights",
                date: "",
                transcript: "",
                "channel name": "Unknown",
                llm_answer: {
                  projects: [],
                  total_count: 0,
                  total_rpoints: 0,
                },
              }
            }
            onClose={() => setExpandedCard(null)}
          />
        )}
      </AnimatePresence>

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

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
      const { projects } = llm_answer;

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
                        key={index}
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
                                key={i}
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
                <div className="flex items-center gap-2">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors backdrop-blur-sm px-2 py-0.5 rounded-full bg-gray-800/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!item.link) e.preventDefault();
                    }}
                  >
                    {item.link ? "Watch Video" : "No Link"}
                  </a>
                  <div className="text-sm text-gray-400 backdrop-blur-sm px-2 py-0.5 rounded-full bg-gray-800/30">
                    <span>{item.llm_answer.projects.length} Coins</span>
                  </div>
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
                link: "",
                llm_answer: {
                  projects: [
                    {
                      coin_or_project: "",
                      marketcap: "",
                      rpoints: 0,
                      total_count: 0,
                      category: [],
                    },
                  ],
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

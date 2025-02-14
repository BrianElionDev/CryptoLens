"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeItem } from "@/types/knowledge";
import { useKnowledge } from "@/contexts/KnowledgeContext";
import { useState } from "react";

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
}

// Add VideoModal component
const VideoModal = ({
  videoUrl,
  onClose,
  videoDetails,
}: {
  videoUrl: string;
  onClose: () => void;
  videoDetails: {
    title: string;
    channel: string;
    date: string;
  };
}) => {
  // Extract video ID from YouTube URL
  const getVideoId = (url: string) => {
    try {
      // Handle youtu.be format
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1];
        return id.split("?")[0];
      }
      // Handle youtube.com format
      if (url.includes("youtube.com/watch")) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        return urlParams.get("v");
      }
      return null;
    } catch {
      console.error("Failed to parse YouTube URL:", url);
      return null;
    }
  };

  const videoId = getVideoId(videoUrl);
  console.log("Video ID:", videoId); // Debug log

  if (!videoId) {
    console.error("Invalid YouTube URL:", videoUrl);
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-8"
    >
      {/* Background overlay with blur */}
      <div className="fixed inset-0 backdrop-blur-xl bg-gray-900/50" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative z-10 w-full h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex flex-col h-full max-w-[95vw] sm:max-w-[90vw] md:max-w-6xl mx-auto">
          {/* Video Details */}
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-t-lg sm:rounded-t-xl p-4 border-x border-t border-gray-700/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-medium text-gray-100 line-clamp-2">
                  {decodeURIComponent(
                    videoDetails.title
                      .replace(/&amp;/g, "&")
                      .replace(/&#39;/g, "'")
                  )}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm mt-2">
                  <div className="text-blue-400/90 backdrop-blur-sm inline-block px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    {videoDetails.channel}
                  </div>
                  <div className="text-gray-400 backdrop-blur-sm inline-block px-2 py-0.5 rounded-full bg-gray-800/30">
                    {new Date(videoDetails.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {/* Close Button - Improved visibility */}
              <button
                onClick={onClose}
                className="group p-2.5 rounded-lg bg-gray-800/80 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-red-500/20 transition-all duration-200 border border-gray-700/50 hover:border-red-500/50 flex-shrink-0 relative"
              >
                <span className="absolute -top-8 right-0 px-2 py-1 text-xs text-gray-400 bg-gray-900/90 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-700/50">
                  Press ESC to close
                </span>
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform"
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
          </div>

          {/* Video Container */}
          <div className="flex-1 bg-gray-900/60 backdrop-blur-sm rounded-b-lg sm:rounded-b-xl overflow-hidden border border-gray-700/50 border-t-0">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              title="YouTube video player"
              className="w-full h-full"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function KnowledgeBase({ items }: KnowledgeBaseProps) {
  const { expandedCard, setExpandedCard } = useKnowledge();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

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
  }) => {
    const [activeTab, setActiveTab] = useState<"stats" | "summary">("stats");

    return (
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
          className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
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

          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "stats"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "summary"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Summary
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "stats" ? (
              renderLLMAnswer(item.llm_answer)
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] rounded-xl bg-gray-900/40 border border-gray-700/50">
                <p className="text-gray-400">Summary coming soon...</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

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
                  {item.link && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveVideo(item.link);
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors backdrop-blur-sm px-2 py-0.5 rounded-full bg-gray-800/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Watch Video
                    </div>
                  )}
                  <div className="text-sm text-gray-400 backdrop-blur-sm px-2 py-0.5 rounded-full bg-gray-800/30">
                    <span>{item.llm_answer.projects.length} Coins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Stats Modal */}
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

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <VideoModal
            videoUrl={activeVideo}
            onClose={() => setActiveVideo(null)}
            videoDetails={{
              title:
                items.find((item) => item.link === activeVideo)?.video_title ||
                "",
              channel:
                items.find((item) => item.link === activeVideo)?.[
                  "channel name"
                ] || "",
              date: items.find((item) => item.link === activeVideo)?.date || "",
            }}
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

"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeItem } from "@/types/knowledge";
import { useState, useEffect } from "react";
import { VideoModal } from "./modals/VideoModal";
import { PlayCircle } from "lucide-react";
import { StatsModal } from "./modals/StatsModal";
import { useCoinGecko } from "@/contexts/CoinGeckoContext";
import { useCMC } from "@/contexts/CMCContext";

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
}

export default function KnowledgeBase({ items }: KnowledgeBaseProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const { matchCoins: matchCoingecko } = useCoinGecko();
  const { matchCoins: matchCMC } = useCMC();
  const [matchedItems, setMatchedItems] = useState<KnowledgeItem[]>([]);

  useEffect(() => {
    const matchProjects = async () => {
      const matched = await Promise.all(
        items.map(async (item) => {
          const projects = item.llm_answer.projects;
          let matchedProjects = matchCoingecko(projects);
          const unmatchedProjects = matchedProjects.filter(
            (p) => !p.coingecko_matched
          );
          const cmcMatchedProjects = await matchCMC(unmatchedProjects);

          matchedProjects = matchedProjects.map((project) => {
            const cmcMatch = cmcMatchedProjects.find(
              (p) => p.coin_or_project === project.coin_or_project
            );
            if (cmcMatch?.cmc_matched) {
              return {
                ...project,
                cmc_matched: true,
                cmc_data: cmcMatch.cmc_data,
              };
            }
            return project;
          });

          return {
            ...item,
            llm_answer: {
              ...item.llm_answer,
              projects: matchedProjects,
            },
          };
        })
      );
      setMatchedItems(matched);
    };

    matchProjects();
  }, [items, matchCoingecko, matchCMC]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {matchedItems.map((item, index) => {
          const projects = item.llm_answer.projects;

          const validCoins = projects.filter(
            (project) => project.coingecko_matched || project.cmc_matched
          ).length;

          return (
            <motion.div
              key={`${item.id || ""}-${item.link || ""}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm p-4 hover:border-blue-500/40 transition-colors cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              {/* Transcript Status */}
              <div className="absolute top-2 right-2 text-lg">
                {item.hasUpdatedTranscript ? "✅" : ""}
              </div>
              <div className="space-y-3">
                {/* Channel Name */}
                <div className="text-sm font-medium text-blue-400">
                  {item["channel name"]}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-gray-200 line-clamp-2 group-hover:text-blue-300 transition-colors">
                  {item.video_title}
                </h3>

                {/* Date and Watch Video */}
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span className="text-sm text-gray-400 shrink-0">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveVideo(item.link);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 rounded-md hover:bg-blue-500/20"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Watch</span>
                  </button>
                  {/* Video Type Badge */}
                  <div
                    className={`text-xs px-2 py-1 rounded-md capitalize ${
                      item.video_type === "short"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {item.video_type}
                  </div>
                  {/* Coin Count */}
                  <div className="text-sm text-gray-400 bg-gray-900/40 px-2 py-1 rounded-md shrink-0">
                    {validCoins} coins
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Stats Modal */}
      <AnimatePresence>
        {selectedItem && (
          <StatsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
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
    </div>
  );
}

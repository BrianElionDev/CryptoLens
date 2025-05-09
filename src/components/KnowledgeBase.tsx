"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeItem, Project } from "@/types/knowledge";
import { useState, useEffect, useMemo, useCallback } from "react";
import { VideoModal } from "./modals/VideoModal";
import { PlayCircle } from "lucide-react";
import { StatsModal } from "./modals/StatsModal";
import { useCoinGecko } from "@/contexts/CoinGeckoContext";
import { useCMC } from "@/contexts/CMCContext";
import { CoinData, useCoinDataQuery } from "@/hooks/useCoinData";

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
  isMatching?: boolean;
}

export default function KnowledgeBase({
  items,
  isMatching = false,
}: KnowledgeBaseProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const { topCoins: geckoCoins } = useCoinGecko();
  const { topCoins: cmcCoins } = useCMC();
  const [matchedItems, setMatchedItems] = useState<KnowledgeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use useCoinDataQuery instead of the individual coin data hook
  const { data: allCoinData, isLoading: isAllCoinsLoading } =
    useCoinDataQuery();

  // Debug logging for coin data - only in development mode
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // Simplify our logging to reduce console clutter
    console.log("CoinData stats:", {
      gecko: geckoCoins?.length || 0,
      cmc: cmcCoins?.length || 0,
      all: Array.isArray(allCoinData) ? allCoinData.length : 0,
      loading: isAllCoinsLoading,
    });
  }, [geckoCoins, cmcCoins, isAllCoinsLoading, allCoinData]);

  // Create a mapping of coin symbols/names to their data
  const coinDataMap = useMemo(() => {
    const map = new Map();

    if (Array.isArray(allCoinData)) {
      allCoinData.forEach((coin) => {
        const typedCoin = coin as CoinData;
        // Map by symbol (lowercase)
        if (typedCoin.symbol) {
          map.set(typedCoin.symbol.toLowerCase(), typedCoin);
        }

        // Also map by name (lowercase)
        if (typedCoin.name) {
          map.set(typedCoin.name.toLowerCase(), typedCoin);
        }
      });
    }

    return map;
  }, [allCoinData]);

  // New matching function using the coinDataMap
  const matchProjectsWithCoinData = useCallback(
    (projects: Project[]) => {
      return projects.map((project: Project) => {
        if (!project.coin_or_project) return project;

        const name = project.coin_or_project.toLowerCase();
        // Try direct match
        let coin = coinDataMap.get(name);

        // If no match, try fuzzy match
        if (!coin) {
          // Try to match part of the name
          const nameParts = name.split(/\s+/);
          for (const part of nameParts) {
            if (part.length >= 3) {
              // Only try with meaningful parts
              for (const [key, value] of Array.from(coinDataMap.entries())) {
                if (key.includes(part) || part.includes(key)) {
                  coin = value;
                  break;
                }
              }
              if (coin) break;
            }
          }
        }

        // If we found a match, determine the source (CoinGecko or CMC)
        if (coin) {
          // Check if this is a CMC coin or CoinGecko coin
          if (coin.data_source === "cmc") {
            return {
              ...project,
              cmc_matched: true,
              cmc_data: coin,
            };
          } else {
            return {
              ...project,
              coingecko_matched: true,
              coingecko_data: coin,
            };
          }
        }

        return project;
      });
    },
    [coinDataMap]
  );

  useEffect(() => {
    const matchProjects = async () => {
      if (!items.length) {
        // Skip verbose logging
        return;
      }

      // Wait for coin data to load
      if (isAllCoinsLoading) {
        // Set items without logging
        setMatchedItems(items);
        return;
      }

      // If we have no coin data map, just show the items as-is
      if (!coinDataMap.size) {
        setMatchedItems(items);
        return;
      }

      setIsProcessing(true);
      try {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `Matching ${items.length} items against ${coinDataMap.size} coins`
          );
        }

        // Map through all items and match their projects
        const matched = items.map((item) => {
          const projects = item.llm_answer.projects;
          const matchedProjects = matchProjectsWithCoinData(projects);

          return {
            ...item,
            llm_answer: {
              ...item.llm_answer,
              projects: matchedProjects,
            },
          };
        });

        setMatchedItems(matched);
      } catch (error) {
        console.error("Error matching projects:", error);
        // If matching fails, still show the items without matches
        setMatchedItems(items);
      } finally {
        setIsProcessing(false);
      }
    };

    matchProjects();
  }, [items, coinDataMap, isAllCoinsLoading, matchProjectsWithCoinData]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm p-4"
          >
            <div className="space-y-3">
              {/* Channel Name Skeleton */}
              <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse" />

              {/* Title Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-700/50 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-700/50 rounded animate-pulse" />
              </div>

              {/* Bottom Row Skeleton */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="h-4 w-20 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-700/50 rounded animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Show skeleton immediately if matching or processing
  if (isMatching || isProcessing || isAllCoinsLoading) {
    return <LoadingSkeleton />;
  }

  // Show empty state if no items
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">No items to display</div>
    );
  }

  // If we have items but no matched items yet, use original items
  const displayItems = matchedItems.length > 0 ? matchedItems : items;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayItems.map((item, index) => {
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

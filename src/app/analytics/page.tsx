"use client";

import { useState, useMemo, useEffect } from "react";
import { useKnowledgeData } from "@/hooks/useCoinData";
import { GraphsTab } from "./components/GraphsTab";
import { CategoriesTab } from "./components/CategoriesTab";
import { CombinedMarketTable } from "@/components/tables/CombinedMarketTable";
import { motion, AnimatePresence } from "framer-motion";
import CoinDetailsModal from "@/components/modals/CoinDetailsModal";
import { ChannelSelector } from "./components/ChannelSelector";
import { AnalyticsTabs, TabType } from "./components/AnalyticsTabs";
import type { CoinData } from "@/hooks/useCoinData";
import type { KnowledgeItem } from "@/types/knowledge";

// Add interface for raw project data
interface RawProjectData {
  coin_or_project: string;
  Rpoints?: number;
  rpoints?: number;
  category?: string[];
}

export default function AnalyticsPage() {
  const { data: knowledge } = useKnowledgeData();
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<{
    symbol: string;
    coingecko_id: string;
    data: CoinData;
  } | null>(null);

  const processedData = useMemo(() => {
    const data = {
      projectDistribution: [] as { name: string; value: number }[],
      projectTrends: new Map<string, { date: string; rpoints: number }[]>(),
      categoryDistribution: [] as { name: string; value: number }[],
      coinCategories: [] as {
        coin: string;
        categories: string[];
        channel: string;
        rpoints: number;
      }[],
      channels: [] as string[],
    };

    if (!knowledge?.length) {
      return data;
    }

    // Create a Map to track unique coins and their categories
    const coinCategoryMap = new Map<string, Set<string>>();
    const projectMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const channelSet = new Set<string>();

    knowledge.forEach((item: KnowledgeItem) => {
      const projects = item.llm_answer.projects;
      const channel = item["channel name"];
      const date = new Date(item.date).toISOString().split("T")[0];
      channelSet.add(channel);

      projects.forEach((project: RawProjectData) => {
        const projectName = project.coin_or_project;
        const rpoints = Number(project.rpoints || project.Rpoints || 0);

        // Update project trends
        if (!data.projectTrends.has(projectName)) {
          data.projectTrends.set(projectName, []);
        }
        const trendData = data.projectTrends.get(projectName)!;
        const existingDateIndex = trendData.findIndex((d) => d.date === date);
        if (existingDateIndex >= 0) {
          trendData[existingDateIndex].rpoints += rpoints;
        } else {
          trendData.push({ date, rpoints });
        }

        // Update project distribution
        const currentPoints = projectMap.get(projectName) || 0;
        projectMap.set(projectName, currentPoints + rpoints);

        // Track unique categories for each coin
        if (project.category) {
          if (!coinCategoryMap.has(projectName)) {
            coinCategoryMap.set(projectName, new Set());
          }
          project.category.forEach((cat) => {
            coinCategoryMap.get(projectName)!.add(cat);
            const currentCount = categoryMap.get(cat) || 0;
            categoryMap.set(cat, currentCount + 1);
          });
        }
      });
    });

    // Convert Maps to arrays
    data.projectDistribution = Array.from(projectMap.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    data.categoryDistribution = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    // Convert coin categories map to array
    data.coinCategories = Array.from(coinCategoryMap.entries())
      .map(([coin, categories]) => ({
        coin,
        categories: Array.from(categories),
        channel:
          knowledge?.find((item: KnowledgeItem) =>
            item.llm_answer.projects.some(
              (p: RawProjectData) => p.coin_or_project === coin
            )
          )?.["channel name"] || "",
        rpoints: projectMap.get(coin) || 0,
      }))
      .sort((a, b) => a.coin.localeCompare(b.coin));

    // Add channels
    data.channels = Array.from(channelSet).sort();

    return data;
  }, [knowledge]);

  // Initialize channels
  useEffect(() => {
    if (processedData.channels.length > 0 && selectedChannels.length === 0) {
      setSelectedChannels(processedData.channels);
    }
  }, [processedData.channels, selectedChannels.length]);

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
      <div className="container mx-auto px-4 2xl:px-0 max-w-[1400px] space-y-8">
        {/* Channel Selector */}
        <div className="flex justify-end mb-4">
          <ChannelSelector
            channels={processedData.channels}
            selectedChannels={selectedChannels}
            onChannelsChange={setSelectedChannels}
          />
        </div>

        <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "market" && (
              <CombinedMarketTable
                processedData={processedData}
                selectedChannels={selectedChannels}
                onCoinSelect={setSelectedCoin}
              />
            )}
            {activeTab === "graphs" && (
              <GraphsTab
                processedData={{
                  projectDistribution: processedData.projectDistribution,
                  projectTrends: processedData.projectTrends,
                  coinCategories: processedData.coinCategories,
                }}
                selectedChannels={selectedChannels}
              />
            )}
            {activeTab === "categories" && (
              <CategoriesTab
                processedData={processedData}
                selectedChannels={selectedChannels}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {selectedCoin && (
          <CoinDetailsModal
            coingecko_id={selectedCoin.coingecko_id}
            data={selectedCoin.data}
            onClose={() => setSelectedCoin(null)}
          />
        )}
      </div>
    </div>
  );
}

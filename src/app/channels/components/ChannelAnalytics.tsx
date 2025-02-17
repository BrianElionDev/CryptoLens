"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CoinCategoriesTab } from "@/app/analytics/components/CoinCategoriesTab";
import { CategoriesTab } from "@/app/analytics/components/CategoriesTab";
import { GraphsTab } from "@/app/analytics/components/GraphsTab";
import type { KnowledgeItem } from "@/types/knowledge";
import { CurrencyDollarIcon, TagIcon } from "../../../components/icons/icons";
import { StatCard } from "@/components/ui/stat-card";

interface Project {
  coin_or_project: string;
  rpoints: number;
  category?: string[];
}

interface ChannelAnalyticsProps {
  knowledge: KnowledgeItem[];
}

export const ChannelAnalytics = ({ knowledge }: ChannelAnalyticsProps) => {
  // Process data for all selected channels
  const processedData = useMemo(() => {
    const data = {
      totalRPoints: 0,
      totalMentions: 0,
      uniqueCoins: new Set<string>(),
      uniqueCategories: new Set<string>(),
      categoryDistribution: new Map<string, number>(),
      coinDistribution: new Map<string, number>(),
      timelineData: new Map<string, number>(),
      projectDistribution: [] as { name: string; value: number }[],
      projectTrends: new Map<string, { date: string; rpoints: number }[]>(),
      coinCategories: [] as {
        coin: string;
        categories: string[];
        channel: string;
      }[],
    };

    knowledge.forEach((item) => {
      const channelName = item["channel name"];
      if (item.llm_answer?.projects) {
        const date = new Date(item.date).toISOString().split("T")[0];
        const projects = Array.isArray(item.llm_answer.projects)
          ? item.llm_answer.projects
          : [item.llm_answer.projects];

        projects.forEach((project: Project) => {
          const coin = project.coin_or_project;
          const rpoints = project.rpoints || 0;
          const categories = project.category || [];

          // Update project trends with channel info
          if (!data.projectTrends.has(coin)) {
            data.projectTrends.set(coin, []);
          }
          const trendData = data.projectTrends.get(coin)!;
          const existingDateIndex = trendData.findIndex((d) => d.date === date);
          if (existingDateIndex >= 0) {
            trendData[existingDateIndex].rpoints += rpoints;
          } else {
            trendData.push({ date, rpoints });
          }

          data.totalRPoints += rpoints;
          data.totalMentions++;
          data.uniqueCoins.add(coin);

          // Update coin distribution
          const currentRPoints = data.coinDistribution.get(coin) || 0;
          data.coinDistribution.set(coin, currentRPoints + rpoints);

          // Update coinCategories with channel info
          const existingCoin = data.coinCategories.find(
            (c) => c.coin === coin && c.channel === channelName
          );
          if (existingCoin) {
            existingCoin.categories = Array.from(
              new Set([...existingCoin.categories, ...(categories || [])])
            );
          } else {
            data.coinCategories.push({
              coin,
              categories: categories || [],
              channel: channelName,
            });
          }

          // Update categories
          categories.forEach((category) => {
            data.uniqueCategories.add(category);
            const currentCount = data.categoryDistribution.get(category) || 0;
            data.categoryDistribution.set(category, currentCount + 1);
          });
        });
      }
    });

    // Sort and convert data
    const sortedDistribution = Array.from(data.coinDistribution.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      ...data,
      projectDistribution: sortedDistribution,
      projectTrends: data.projectTrends,
      uniqueCoins: Array.from(data.uniqueCoins),
      uniqueCategories: Array.from(data.uniqueCategories),
      categoryDistribution: Array.from(data.categoryDistribution.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      coinDistribution: sortedDistribution,
      timelineData: Array.from(data.timelineData.entries())
        .map(([date, value]) => ({ date, value }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    };
  }, [knowledge]);

  // Get the highest rated coin
  const topCoin = processedData.coinDistribution[0] || {
    name: "N/A",
    value: 0,
  };

  // Initialize with first coin as default
  const [selectedProject, setSelectedProject] = useState(topCoin.name);

  // Update selected project if distribution changes
  useEffect(() => {
    if (processedData.coinDistribution.length > 0) {
      setSelectedProject(processedData.coinDistribution[0].name);
    }
  }, [processedData.coinDistribution]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Unique Coins"
          value={processedData.uniqueCoins.length}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
        />
        {/* highest rated coin */}
        <StatCard
          title="Highest Rated Coin"
          value={topCoin.name}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
        />
        {/* categories */}
        <StatCard
          title="Categories"
          value={processedData.uniqueCategories.length}
          icon={<TagIcon className="w-5 h-5" />}
        />
        {/* highest rated category */}
        <StatCard
          title="Highest Rated Category"
          value={processedData.categoryDistribution[0]?.name || "N/A"}
          icon={<TagIcon className="w-5 h-5" />}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="graphs" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 mb-8 bg-transparent">
          <TabsTrigger
            value="graphs"
            className="relative px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
            data-[state=active]:border data-[state=active]:border-blue-500/50
            data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.15)]
            hover:bg-gray-700/30 text-gray-400 data-[state=active]:text-gray-100"
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="font-medium">Graphs</span>
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="relative px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
            data-[state=active]:border data-[state=active]:border-blue-500/50
            data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.15)]
            hover:bg-gray-700/30 text-gray-400 data-[state=active]:text-gray-100"
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="font-medium">Coin Categories</span>
          </TabsTrigger>
          <TabsTrigger
            value="categories-overview"
            className="relative px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300
            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
            data-[state=active]:border data-[state=active]:border-blue-500/50
            data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.15)]
            hover:bg-gray-700/30 text-gray-400 data-[state=active]:text-gray-100"
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span className="font-medium">Categories</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="graphs" className="focus:outline-none">
            <div className="md:bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-0">
              <div className="md:bg-gray-900/40 md:backdrop-blur-sm rounded-lg bg-transparent">
                <GraphsTab
                  processedData={{
                    projectDistribution: processedData.projectDistribution,
                    projectTrends: processedData.projectTrends,
                    coinCategories: processedData.coinCategories.map(
                      (coin) => ({
                        coin: coin.coin,
                        channel: coin.channel,
                      })
                    ),
                  }}
                  knowledge={knowledge}
                  selectedProject={selectedProject}
                  setSelectedProject={setSelectedProject}
                  selectedChannels={[knowledge[0]?.["channel name"] || ""]}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="focus:outline-none">
            <div className="md:bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-0">
              <div className="md:bg-gray-900/40 md:backdrop-blur-sm rounded-lg bg-transparent">
                <CoinCategoriesTab processedData={processedData} />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="categories-overview"
            className="focus:outline-none"
          >
            <div className="md:bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-0">
              <div className="md:bg-gray-900/40 md:backdrop-blur-sm rounded-lg bg-transparent">
                <CategoriesTab
                  processedData={{
                    categoryDistribution: processedData.categoryDistribution,
                    coinCategories: processedData.coinCategories.map(
                      (coin) => ({
                        ...coin,
                        channel: knowledge[0]?.["channel name"] || "",
                        rpoints:
                          processedData.coinDistribution.find(
                            (c) => c.name === coin.coin
                          )?.value || 0,
                      })
                    ),
                  }}
                  selectedChannels={[knowledge[0]?.["channel name"] || ""]}
                />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

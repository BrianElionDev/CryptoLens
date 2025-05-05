"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useKnowledgeData } from "@/hooks/useCoinData";
import { CombinedMarketTable } from "@/components/tables/CombinedMarketTable";
import Image from "next/image";
import type { KnowledgeItem } from "@/types/knowledge";
import { TrendingUp, Clock3, RefreshCw } from "lucide-react";

interface AnalyticsClientProps {
  initialData: KnowledgeItem[];
}

// Trending coin interface from CoinGecko
interface TrendingCoin {
  item: {
    id: string;
    coin_id?: number;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    small?: string;
    large?: string;
    slug: string;
    price_btc: number;
    score: number;
    data?: {
      price: string;
      price_change_percentage_24h: {
        usd: number;
      };
    };
  };
}

// Fear & Greed data interface
interface FearGreedData {
  name: string;
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update: string;
  }>;
  metadata: {
    error: null | string;
  };
}

// Project interface for type safety
interface Project {
  coin_or_project?: string;
  rpoints?: number;
  Rpoints?: number;
  total_count?: number;
  category?: string[];
}

export function CryptoMarketsPage({ initialData }: AnalyticsClientProps) {
  // Try to use the hook, but handle potential errors gracefully
  let knowledgeData;
  try {
    const result = useKnowledgeData();
    knowledgeData = result?.data;
  } catch (error) {
    console.error("Error using useKnowledgeData:", error);
    // Fall back to initialData
    knowledgeData = initialData;
  }

  // Make sure we always have valid data
  const knowledge = knowledgeData || initialData;

  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
  const [fearGreedIndex, setFearGreedIndex] = useState<{
    value: string;
    classification: string;
    timestamp: string;
  } | null>(null);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingFearGreed, setIsLoadingFearGreed] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Process data for market table
  const processedData = useState(() => {
    const data = {
      projectDistribution: [] as { name: string; value: number }[],
      projectTrends: new Map<string, { date: string; rpoints: number }[]>(),
      categoryDistribution: [] as { name: string; value: number }[],
      coinCategories: [] as {
        coin: string;
        categories: string[];
        channel: string;
        date: string;
        rpoints: number;
        total_count: number;
      }[],
      channels: [] as string[],
    };

    if (!knowledge?.length) {
      return data;
    }

    // Processing logic from the original AnalyticsClient
    const coinCategoryMap = new Map<string, Set<string>>();
    const projectMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const channelSet = new Set<string>();
    const coinDates = new Map<
      string,
      { date: string; channel: string; count: number }[]
    >();

    knowledge.forEach((item: KnowledgeItem) => {
      const projects = item.llm_answer.projects;
      const channel = item["channel name"];
      const date = new Date(item.date).toISOString().split("T")[0];
      channelSet.add(channel);

      projects.forEach((project: Project) => {
        const projectName = project.coin_or_project?.toLowerCase().trim();
        if (!projectName) return;

        const rpoints = Number(project.rpoints || project.Rpoints || 0);
        if (rpoints <= 0) return;

        // Track dates, channels, and mention counts for each coin
        if (!coinDates.has(projectName)) {
          coinDates.set(projectName, []);
        }
        coinDates.get(projectName)!.push({
          date,
          channel,
          count: project.total_count || 1,
        });

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
          project.category.forEach((cat: string) => {
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

    // Convert coin categories map to array with dates and counts
    data.coinCategories = Array.from(coinCategoryMap.entries())
      .flatMap(([coin, categories]) => {
        const dateEntries = coinDates.get(coin) || [];
        return dateEntries.map((dateInfo) => ({
          coin,
          categories: Array.from(categories),
          channel: dateInfo.channel,
          date: dateInfo.date,
          rpoints: projectMap.get(coin) || 0,
          total_count: dateInfo.count,
        }));
      })
      .sort((a, b) => b.rpoints - a.rpoints);

    // Add channels with stable sorting
    data.channels = Array.from(channelSet).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    return data;
  })[0];

  // Initialize channels with a stable reference
  useEffect(() => {
    if (processedData.channels.length > 0) {
      const stableChannels = [...processedData.channels].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
      setSelectedChannels(stableChannels);
    }
  }, [processedData.channels]);

  // Fetch trending coins from CoinGecko
  const fetchTrendingCoins = async () => {
    try {
      setIsLoadingTrending(true);
      const response = await fetch(
        "https://api.coingecko.com/api/v3/search/trending"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch trending coins");
      }
      const data = await response.json();
      setTrendingCoins(data.coins.slice(0, 5)); // Take top 5 coins
    } catch (error) {
      console.error("Error fetching trending coins:", error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Fetch Fear & Greed Index data
  const fetchFearGreedIndex = async () => {
    try {
      setIsLoadingFearGreed(true);
      const response = await fetch("https://api.alternative.me/fng/?limit=1");
      if (!response.ok) {
        throw new Error("Failed to fetch fear & greed index");
      }
      const data: FearGreedData = await response.json();
      if (data?.data?.[0]) {
        setFearGreedIndex({
          value: data.data[0].value,
          classification: data.data[0].value_classification,
          timestamp: data.data[0].timestamp,
        });
      }
    } catch (error) {
      console.error("Error fetching fear & greed index:", error);
    } finally {
      setIsLoadingFearGreed(false);
    }
  };

  // Replace the standalone refreshData function with useCallback
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([fetchTrendingCoins(), fetchFearGreedIndex()]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, []);

  // Set up data refresh interval
  useEffect(() => {
    // Initial data load
    fetchTrendingCoins();
    fetchFearGreedIndex();

    // Set up refresh interval (every 15 seconds)
    refreshIntervalRef.current = setInterval(() => {
      refreshData();
    }, 15000);

    // Set up countdown timer
    refreshCountdownRef.current = setInterval(() => {
      // Countdown logic removed to fix lint error
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (refreshCountdownRef.current) {
        clearInterval(refreshCountdownRef.current);
      }
    };
  }, [refreshData]); // Include refreshData as dependency

  // Get color for fear & greed index
  const getFearGreedColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case "extreme fear":
        return "text-red-500";
      case "fear":
        return "text-orange-500";
      case "neutral":
        return "text-yellow-500";
      case "greed":
        return "text-green-500";
      case "extreme greed":
        return "text-emerald-500";
      default:
        return "text-gray-400";
    }
  };

  const formatFearGreedDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format percent change
  const formatPercentChange = (percent: number) => {
    if (isNaN(percent)) return "0.00%";
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
      <div className="container mx-auto px-4 2xl:px-0 max-w-[1400px] space-y-6">
        {/* Title Bar with Last Updated */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
              Today&apos;s Cryptocurrency Prices by Market Cap
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            The global crypto market cap is $2.97T, a{" "}
            <span className="text-red-500">↓ 0.57%</span> decrease over the last
            day.{" "}
            <span className="text-blue-400 hover:underline cursor-pointer">
              Read More
            </span>
          </p>
        </div>

        {/* Top Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Trending Coins Card */}
          <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-blue-900/10 border border-gray-800/40 rounded-xl p-4 col-span-1 md:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <h2 className="font-semibold text-white">Trending Coins</h2>
              </div>
              <button
                className={`text-gray-400 hover:text-white flex items-center gap-1 ${
                  isLoadingTrending ? "text-blue-400" : ""
                }`}
                onClick={fetchTrendingCoins}
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    isLoadingTrending ? "animate-spin" : ""
                  }`}
                />
                <span className="text-xs">Refresh</span>
              </button>
            </div>
            <div className="space-y-3 min-h-[230px]">
              {isLoadingTrending
                ? // Loading skeletons
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 text-gray-400 font-medium w-5 text-center">
                            {i + 1}
                          </div>
                          <div className="h-8 w-8 bg-gray-700/50 rounded-full" />
                          <div className="space-y-1">
                            <div className="h-4 w-24 bg-gray-700/50 rounded" />
                            <div className="h-3 w-16 bg-gray-700/30 rounded" />
                          </div>
                        </div>
                        <div className="h-4 w-16 bg-gray-700/50 rounded" />
                      </div>
                    ))
                : // Actual trending coins
                  trendingCoins.map((coin, index) => (
                    <div
                      key={coin.item.id}
                      className="flex items-center justify-between py-1 hover:bg-gray-800/20 rounded-lg transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 text-gray-400 font-medium w-5 text-center">
                          {index + 1}
                        </div>
                        <div className="w-8 h-8 flex-shrink-0">
                          <Image
                            src={coin.item.thumb}
                            alt={coin.item.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {coin.item.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {coin.item.symbol}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {coin.item.price_btc
                              ? `${coin.item.price_btc.toFixed(8)} BTC`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          (coin.item.data?.price_change_percentage_24h?.usd ||
                            0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {coin.item.data?.price_change_percentage_24h?.usd
                          ? formatPercentChange(
                              coin.item.data.price_change_percentage_24h.usd
                            )
                          : ""}
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Fear & Greed Index Card */}
          <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-blue-900/10 border border-gray-800/40 rounded-xl p-4 col-span-1 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-white">Fear & Greed</h2>
              <button
                className={`text-gray-400 hover:text-white flex items-center gap-1 ${
                  isLoadingFearGreed ? "text-blue-400" : ""
                }`}
                onClick={fetchFearGreedIndex}
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    isLoadingFearGreed ? "animate-spin" : ""
                  }`}
                />
                <span className="text-xs">Refresh</span>
              </button>
            </div>
            <div className="min-h-[280px]">
              {isLoadingFearGreed ? (
                <div className="flex items-center justify-center h-[260px] animate-pulse">
                  <div className="w-32 h-32 rounded-full bg-gray-700/50"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-40 h-40 mb-2">
                    {/* Background circle with gradient */}
                    <div className="absolute inset-0 rounded-full bg-gray-800/50"></div>

                    {/* Colored segments */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                    >
                      {/* Extreme Fear (0-25) */}
                      <path
                        d="M50 10 A40 40 0 0 1 90 50 L50 50 Z"
                        fill="#ef4444"
                        fillOpacity="0.2"
                        stroke="#ef4444"
                        strokeWidth="0.5"
                      />
                      {/* Fear (25-40) */}
                      <path
                        d="M90 50 A40 40 0 0 1 75 85 L50 50 Z"
                        fill="#f97316"
                        fillOpacity="0.2"
                        stroke="#f97316"
                        strokeWidth="0.5"
                      />
                      {/* Neutral (40-60) */}
                      <path
                        d="M75 85 A40 40 0 0 1 25 85 L50 50 Z"
                        fill="#facc15"
                        fillOpacity="0.2"
                        stroke="#facc15"
                        strokeWidth="0.5"
                      />
                      {/* Greed (60-75) */}
                      <path
                        d="M25 85 A40 40 0 0 1 10 50 L50 50 Z"
                        fill="#84cc16"
                        fillOpacity="0.2"
                        stroke="#84cc16"
                        strokeWidth="0.5"
                      />
                      {/* Extreme Greed (75-100) */}
                      <path
                        d="M10 50 A40 40 0 0 1 50 10 L50 50 Z"
                        fill="#22c55e"
                        fillOpacity="0.2"
                        stroke="#22c55e"
                        strokeWidth="0.5"
                      />

                      {/* Labels */}
                      <text
                        x="43"
                        y="18"
                        fontSize="3.5"
                        fill="#ef4444"
                        fontWeight="bold"
                      >
                        Extreme Fear
                      </text>
                      <text
                        x="80"
                        y="53"
                        fontSize="3.5"
                        fill="#f97316"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform="rotate(45, 82, 50)"
                      >
                        Fear
                      </text>
                      <text
                        x="50"
                        y="92"
                        fontSize="3.5"
                        fill="#facc15"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        Neutral
                      </text>
                      <text
                        x="18"
                        y="53"
                        fontSize="3.5"
                        fill="#84cc16"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform="rotate(-45, 18, 50)"
                      >
                        Greed
                      </text>
                      <text
                        x="50"
                        y="28"
                        fontSize="3.5"
                        fill="#22c55e"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform="rotate(180, 50, 26)"
                      >
                        Extreme Greed
                      </text>
                    </svg>

                    {/* Center circle with value */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gray-900/70 backdrop-blur-sm flex items-center justify-center border-2 border-gray-700">
                        <span
                          className={`text-4xl font-bold ${
                            fearGreedIndex
                              ? getFearGreedColor(fearGreedIndex.classification)
                              : "text-gray-400"
                          }`}
                        >
                          {fearGreedIndex?.value || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Pointer needle */}
                    {fearGreedIndex?.value && (
                      <div
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{
                          transform: `rotate(${
                            (parseInt(fearGreedIndex.value) / 100) * 360 + 90
                          }deg)`,
                          transformOrigin: "center",
                          transition: "transform 0.5s ease-out",
                        }}
                      >
                        <div className="w-0.5 h-20 bg-white absolute top-1/2 left-1/2 transform -translate-y-[70%] drop-shadow-md">
                          <div className="w-2 h-2 rounded-full bg-white absolute -top-1 left-1/2 transform -translate-x-1/2"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Classification and explanation */}
                  <div
                    className={`text-xl font-medium mb-1 ${
                      fearGreedIndex
                        ? getFearGreedColor(fearGreedIndex.classification)
                        : "text-gray-400"
                    }`}
                  >
                    {fearGreedIndex?.classification || "N/A"}
                  </div>

                  <div className="text-xs text-gray-400 flex items-center mb-2">
                    <Clock3 className="h-3 w-3 mr-1" />
                    {fearGreedIndex?.timestamp
                      ? `Updated ${formatFearGreedDate(
                          fearGreedIndex.timestamp
                        )}`
                      : "N/A"}
                  </div>

                  {/* Explanation based on classification */}
                  <div className="text-xs text-gray-300 bg-gray-800/40 p-2 rounded-md text-center max-w-xs">
                    {fearGreedIndex?.classification === "Extreme Fear" &&
                      "Investors are extremely worried, which could represent a buying opportunity."}
                    {fearGreedIndex?.classification === "Fear" &&
                      "Investors are worried, which may indicate assets are undervalued."}
                    {fearGreedIndex?.classification === "Neutral" &&
                      "Market sentiment is balanced between fear and greed."}
                    {fearGreedIndex?.classification === "Greed" &&
                      "Investors are getting greedy, which may signal a correction soon."}
                    {fearGreedIndex?.classification === "Extreme Greed" &&
                      "Investors are extremely greedy, market may be due for a correction."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Market Table */}
        <CombinedMarketTable
          processedData={processedData}
          selectedChannels={selectedChannels}
          onCoinSelect={() => {}}
          onChannelsChange={setSelectedChannels}
        />
      </div>
    </div>
  );
}

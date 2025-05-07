"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useKnowledgeData } from "@/hooks/useCoinData";
import { CombinedMarketTable } from "@/components/tables/CombinedMarketTable";
import type { KnowledgeItem } from "@/types/knowledge";
import { RefreshCw, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
  const router = useRouter();

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
  const [globalMarketData, setGlobalMarketData] = useState<{
    marketCap: number;
    volume24h: number;
    marketCapChange24h: number;
    isLoading: boolean;
  }>({
    marketCap: 0,
    volume24h: 0,
    marketCapChange24h: 0,
    isLoading: true,
  });
  const globalMarketIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Add a function to handle coin navigation
  const handleCoinClick = (coinId: string) => {
    router.push(`/coin/${coinId}`);
  };

  const fetchGlobalMarketData = useCallback(async () => {
    setGlobalMarketData((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/global");
      if (!res.ok) throw new Error("Failed to fetch global market data");
      const data = await res.json();
      setGlobalMarketData({
        marketCap: data.data.total_market_cap.usd,
        volume24h: data.data.total_volume.usd,
        marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
        isLoading: false,
      });
    } catch (e) {
      console.error("Error fetching global market data:", e);
      setGlobalMarketData((prev) => ({ ...prev, isLoading: false }));
      // Optionally log error
    }
  }, []);

  useEffect(() => {
    fetchGlobalMarketData();
    globalMarketIntervalRef.current = setInterval(
      fetchGlobalMarketData,
      60000
    ); // 1 min
    return () => {
      if (globalMarketIntervalRef.current)
        clearInterval(globalMarketIntervalRef.current);
    };
  }, [fetchGlobalMarketData]);

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
          <div className="text-xs text-gray-400">
            {globalMarketData.isLoading ? (
              <span className="inline-block w-40 h-4 bg-gray-700/50 rounded animate-pulse" />
            ) : (
              <>
                The global cryptocurrency market cap today is
                <span className="font-semibold text-white ml-1">
                  {(() => {
                    const cap = globalMarketData.marketCap;
                    if (cap >= 1e12)
                      return `$${(cap / 1e12).toFixed(1)} Trillion`;
                    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)} Billion`;
                    return `$${cap.toLocaleString()}`;
                  })()}
                </span>
                ,
                <span
                  className={`ml-1 font-semibold ${
                    globalMarketData.marketCapChange24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {globalMarketData.marketCapChange24h >= 0 ? (
                    <>▲ {globalMarketData.marketCapChange24h.toFixed(2)}%</>
                  ) : (
                    <>
                      ▼{" "}
                      {Math.abs(globalMarketData.marketCapChange24h).toFixed(2)}
                      %
                    </>
                  )}
                </span>
                change in the last 24 hours.
              </>
            )}
            <a
              href="https://www.coingecko.com/en/global-market-cap"
              className="text-blue-400 hover:text-blue-500 ml-2"
            >
              Read More
            </a>
          </div>
        </div>

        {/* Top Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Trending Coins Card */}
          <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-blue-900/10 border border-gray-800/40 rounded-xl p-4 col-span-1">
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
                ? // Loading skeletons with fixed height to match actual content
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 h-[46px]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 text-gray-400 font-medium w-5 text-center">
                            {i + 1}
                          </div>
                          <div className="h-8 w-8 bg-gray-700/50 rounded-full flex-shrink-0" />
                          <div className="space-y-1.5">
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
                      className="flex items-center justify-between py-1 hover:bg-gray-800/20 rounded-lg transition cursor-pointer h-[46px]"
                      onClick={() => handleCoinClick(coin.item.id)}
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

          {/* Global Market Stats Card */}
          <div className="bg-gradient-to-r from-blue-900/10 via-green-900/10 to-blue-900/10 border border-gray-800/40 rounded-xl p-4 col-span-1 flex flex-col gap-3 min-h-[220px]">
            <div className="text-lg font-semibold text-white mb-1">
              Global Market Stats
            </div>
            {globalMarketData.isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full bg-gray-800/40 border border-gray-700/30 rounded-lg p-4 flex items-center min-h-[64px]"
                  >
                    <div className="w-8 h-8 bg-gray-700/50 rounded-full mr-4" />
                    <div className="flex-1">
                      <div className="w-24 h-5 bg-gray-700/40 rounded mb-1" />
                      <div className="w-16 h-3 bg-gray-700/30 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Market Cap */}
                <div>
                  <div className="font-bold text-sm text-blue-300 mb-1 pl-1">
                    Market Capitalization
                  </div>
                  <div className="w-full bg-gray-800/40 border border-gray-700/30 rounded-lg p-4 flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/30 mr-4">
                      <svg
                        width="28"
                        height="28"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          fill="#0ea5e9"
                          fillOpacity="0.15"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-xl">
                        ${globalMarketData.marketCap.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-300 mt-0.5">
                        Market Cap
                      </div>
                    </div>
                  </div>
                </div>
                {/* 24h Volume */}
                <div>
                  <div className="font-bold text-sm text-green-300 mb-1 pl-1">
                    24h Trading Volume
                  </div>
                  <div className="w-full bg-gray-800/40 border border-gray-700/30 rounded-lg p-4 flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-900/30 mr-4">
                      <svg
                        width="28"
                        height="28"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="4"
                          y="10"
                          width="16"
                          height="8"
                          rx="2"
                          stroke="#34d399"
                          strokeWidth="2"
                          fill="#22c55e"
                          fillOpacity="0.15"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-xl">
                        ${globalMarketData.volume24h.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-300 mt-0.5">
                        24h Volume
                      </div>
                    </div>
                  </div>
                </div>
                {/* 24h % Change */}
                <div>
                  <div className="font-bold text-sm text-gray-300 mb-1 pl-1">
                    24h Market Cap Change
                  </div>
                  <div className="w-full bg-gray-800/40 border border-gray-700/30 rounded-lg p-4 flex items-center">
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full mr-4 ${
                        globalMarketData.marketCapChange24h >= 0
                          ? "bg-green-900/30"
                          : "bg-red-900/30"
                      }`}
                    >
                      {globalMarketData.marketCapChange24h >= 0 ? (
                        <svg
                          width="28"
                          height="28"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12 19V5M12 5l-5 5M12 5l5 5"
                            stroke="#4ade80"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="28"
                          height="28"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12 5v14m0 0l-5-5m5 5l5-5"
                            stroke="#f87171"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-bold text-xl ${
                          globalMarketData.marketCapChange24h >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {globalMarketData.marketCapChange24h >= 0 ? (
                          <>
                            +{globalMarketData.marketCapChange24h.toFixed(2)}%
                          </>
                        ) : (
                          <>{globalMarketData.marketCapChange24h.toFixed(2)}%</>
                        )}
                      </div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        24h Change
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fear & Greed Index Card - Simpler Layout Matching User's Image */}
          <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-blue-900/10 border border-gray-800/40 rounded-xl p-4 col-span-1 md:col-span-1 xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
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
            <div className="min-h-[180px]">
              {isLoadingFearGreed ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                  {/* Left Column - Value and Date Skeleton */}
                  <div className="bg-gray-800/30 border border-gray-700/20 rounded-lg p-4 flex flex-col items-center justify-center">
                    <div className="w-20 h-10 bg-gray-700/50 rounded-lg mb-2"></div>
                    <div className="w-32 h-5 bg-gray-700/40 rounded-lg mb-2"></div>
                    <div className="w-24 h-3 bg-gray-700/30 rounded-lg"></div>
                  </div>

                  {/* Right Column - Gauge Skeleton */}
                  <div className="bg-gray-800/30 border border-gray-700/20 rounded-lg p-4">
                    <div className="w-full h-32 flex items-center justify-center">
                      <div className="w-[160px] h-[80px] bg-gray-700/40 rounded-t-full"></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="w-12 h-6 bg-gray-700/30 rounded"></div>
                      <div className="w-10 h-4 bg-gray-700/30 rounded"></div>
                      <div className="w-14 h-4 bg-gray-700/30 rounded"></div>
                      <div className="w-10 h-4 bg-gray-700/30 rounded"></div>
                      <div className="w-12 h-6 bg-gray-700/30 rounded"></div>
                    </div>
                  </div>

                  {/* Bottom Row - Legend and Interpretation Skeletons */}
                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Legend Skeleton */}
                    <div className="bg-gray-800/30 border border-gray-700/20 rounded-lg p-3">
                      <div className="w-16 h-4 bg-gray-700/40 rounded mb-2"></div>
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-700/50"></div>
                            <div className="w-14 h-3 bg-gray-700/40 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interpretation Skeleton */}
                    <div className="bg-gray-800/30 border border-gray-700/20 rounded-lg p-3">
                      <div className="w-24 h-4 bg-gray-700/40 rounded mb-2"></div>
                      <div className="w-full h-3 bg-gray-700/30 rounded mb-2"></div>
                      <div className="w-3/4 h-3 bg-gray-700/30 rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column - Value and Date */}
                  <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                    <div
                      className={`text-4xl font-bold mb-1 ${
                        fearGreedIndex
                          ? getFearGreedColor(fearGreedIndex.classification)
                          : "text-gray-400"
                      }`}
                    >
                      {fearGreedIndex?.value || "N/A"}
                    </div>
                    <div
                      className={`text-lg font-medium mb-1 ${
                        fearGreedIndex
                          ? getFearGreedColor(fearGreedIndex.classification)
                          : "text-gray-400"
                      }`}
                    >
                      {fearGreedIndex?.classification || "N/A"}
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      Updated:{" "}
                      {fearGreedIndex?.timestamp
                        ? formatFearGreedDate(fearGreedIndex.timestamp)
                        : "N/A"}
                    </div>
                  </div>

                  {/* Right Column - Gauge */}
                  <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-3 flex flex-col justify-center relative">
                    {/* Semi-circular gauge */}
                    <div className="w-full h-32 relative">
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 200 120"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Colored semicircle segments */}
                        <path
                          d="M 30,100 A 70,70 0 0,1 170,100"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray="44 160"
                          strokeDashoffset="0"
                        />
                        <path
                          d="M 30,100 A 70,70 0 0,1 170,100"
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray="44 160"
                          strokeDashoffset="-44"
                        />
                        <path
                          d="M 30,100 A 70,70 0 0,1 170,100"
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray="22 160"
                          strokeDashoffset="-88"
                        />
                        <path
                          d="M 30,100 A 70,70 0 0,1 170,100"
                          fill="none"
                          stroke="#84cc16"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray="44 160"
                          strokeDashoffset="-110"
                        />
                        <path
                          d="M 30,100 A 70,70 0 0,1 170,100"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray="44 160"
                          strokeDashoffset="-154"
                        />

                        {/* Tick marks with values */}
                        <text
                          x="30"
                          y="115"
                          fontSize="9"
                          fill="#94a3b8"
                          textAnchor="middle"
                        >
                          0
                        </text>
                        <text
                          x="65"
                          y="65"
                          fontSize="9"
                          fill="#94a3b8"
                          textAnchor="middle"
                        >
                          25
                        </text>
                        <text
                          x="100"
                          y="45"
                          fontSize="9"
                          fill="#94a3b8"
                          textAnchor="middle"
                        >
                          50
                        </text>
                        <text
                          x="135"
                          y="65"
                          fontSize="9"
                          fill="#94a3b8"
                          textAnchor="middle"
                        >
                          75
                        </text>
                        <text
                          x="170"
                          y="115"
                          fontSize="9"
                          fill="#94a3b8"
                          textAnchor="middle"
                        >
                          100
                        </text>

                        {/* Gauge needle - larger and more visible */}
                        {fearGreedIndex?.value && (
                          <>
                            {/* Center point indicator */}
                            <circle
                              cx="100"
                              cy="100"
                              r="6"
                              fill="white"
                              stroke="#1e293b"
                              strokeWidth="1"
                            />

                            {/* Calculate position on the semicircle */}
                            {(() => {
                              // Convert value to angle in radians (0 = -180°, 100 = 0°)
                              const angle =
                                (parseInt(fearGreedIndex.value) / 100) *
                                  Math.PI -
                                Math.PI;

                              // Calculate end point of needle
                              const endX = 100 + 60 * Math.cos(angle);
                              const endY = 100 + 60 * Math.sin(angle);

                              return (
                                <>
                                  <line
                                    x1="100"
                                    y1="100"
                                    x2={endX}
                                    y2={endY}
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                  />
                                  <circle
                                    cx={endX}
                                    cy={endY}
                                    r="2.5"
                                    fill="white"
                                  />
                                </>
                              );
                            })()}
                          </>
                        )}
                      </svg>
                    </div>

                    {/* Category Labels below gauge */}
                    <div className="flex justify-between text-[10px]">
                      <span className="text-red-400 text-center leading-tight">
                        Extreme
                        <br />
                        Fear
                      </span>
                      <span className="text-orange-400 text-center">Fear</span>
                      <span className="text-yellow-400 text-center">
                        Neutral
                      </span>
                      <span className="text-lime-400 text-center">Greed</span>
                      <span className="text-green-400 text-center leading-tight">
                        Extreme
                        <br />
                        Greed
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row - Legend and Interpretation */}
                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Legend */}
                    <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-3">
                      <h3 className="text-xs font-medium text-gray-300 mb-2">
                        Legend
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-red-400 text-xs">0-25</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-orange-400 text-xs">25-50</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-yellow-400 text-xs">50-60</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                          <span className="text-lime-400 text-xs">60-75</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-green-400 text-xs">75-100</span>
                        </div>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-3">
                      <h3 className="text-xs font-medium text-gray-300 mb-1.5">
                        Interpretation
                      </h3>
                      <div className="text-xs text-gray-200">
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

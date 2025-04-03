"use client";

import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCoinData } from "@/hooks/useCoinData";
import Image from "next/image";
import { DataTable } from "@/components/ui/data-table";
import type { Row } from "@tanstack/react-table";
import { CalendarIcon, Filter } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

type ExtendedCoinData = CoinData & {
  rpoints: number;
  total_mentions: number;
};

interface CoinCategoryData {
  channel: string;
  date: string;
  coin: string;
  rpoints: number;
  categories: string[];
  total_count: number;
}

interface ProcessedData {
  projectDistribution: { name: string; value: number }[];
  projectTrends: Map<string, { date: string; rpoints: number }[]>;
  categoryDistribution: { name: string; value: number }[];
  coinCategories: CoinCategoryData[];
  channels: string[];
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CombinedMarketTableProps {
  processedData: ProcessedData;
  selectedChannels: string[];
  onCoinSelect?: (coin: {
    symbol: string;
    coingecko_id: string;
    data: ExtendedCoinData;
  }) => void;
}

export function CombinedMarketTable({
  processedData,
  selectedChannels,
  onCoinSelect,
}: CombinedMarketTableProps) {
  const router = useRouter();
  const [showMostRecent, setShowMostRecent] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [datePreset, setDatePreset] = useState<string>("");
  const refreshKeyRef = useRef(0);
  const prevDataRef = useRef<ExtendedCoinData[]>([]);

  // Get unique dates from coinCategories
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    processedData.coinCategories.forEach((coin) => {
      if (
        selectedChannels.length === 0 ||
        selectedChannels.includes(coin.channel)
      ) {
        dates.add(coin.date);
      }
    });
    return Array.from(dates).sort();
  }, [processedData.coinCategories, selectedChannels]);

  // Get earliest and latest dates
  const dateRangeInfo = useMemo(() => {
    if (availableDates.length === 0) return null;
    const earliest = new Date(availableDates[0]);
    const latest = new Date(availableDates[availableDates.length - 1]);
    return { earliest, latest };
  }, [availableDates]);

  // Handle preset date range selection
  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    const now = new Date();

    if (value === "today") {
      const today = startOfDay(now);
      setDateRange({ from: today, to: endOfDay(now) });
    } else if (value === "yesterday") {
      const yesterday = startOfDay(subDays(now, 1));
      setDateRange({ from: yesterday, to: endOfDay(yesterday) });
    } else if (value === "last7days") {
      const lastWeek = startOfDay(subDays(now, 7));
      setDateRange({ from: lastWeek, to: endOfDay(now) });
    } else if (value === "last30days") {
      const lastMonth = startOfDay(subDays(now, 30));
      setDateRange({ from: lastMonth, to: endOfDay(now) });
    } else if (value === "last90days") {
      const last3Months = startOfDay(subDays(now, 90));
      setDateRange({ from: last3Months, to: endOfDay(now) });
    } else if (value === "last180days") {
      const last6Months = startOfDay(subDays(now, 180));
      setDateRange({ from: last6Months, to: endOfDay(now) });
    } else if (value === "last365days") {
      const lastYear = startOfDay(subDays(now, 365));
      setDateRange({ from: lastYear, to: endOfDay(now) });
    } else if (value === "custom") {
      // Don't reset the date range when switching to custom
      if (!dateRange.from && !dateRange.to) {
        setDateRange({ from: undefined, to: undefined });
      }
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
  };

  const handleCoinSelect = (coin: ExtendedCoinData | null) => {
    if (!onCoinSelect || !coin) return;
    onCoinSelect({
      symbol: coin.symbol,
      coingecko_id: coin.id,
      data: {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price || coin.current_price || 0,
        current_price: coin.price || coin.current_price || 0,
        market_cap: coin.market_cap || 0,
        volume_24h: coin.total_volume || coin.volume_24h || 0,
        percent_change_24h:
          coin.price_change_percentage_24h || coin.percent_change_24h || 0,
        price_change_percentage_24h:
          coin.price_change_percentage_24h || coin.percent_change_24h || 0,
        circulating_supply: coin.circulating_supply || 0,
        image: coin.image || "",
        coingecko_id: coin.id,
        cmc_id: coin.cmc_id,
        market_cap_rank: coin.market_cap_rank || 0,
        fully_diluted_valuation: coin.fully_diluted_valuation || 0,
        total_volume: coin.total_volume || coin.volume_24h || 0,
        high_24h: coin.high_24h || 0,
        low_24h: coin.low_24h || 0,
        price_change_24h: coin.price_change_24h || 0,
        market_cap_change_24h: coin.market_cap_change_24h || 0,
        market_cap_change_percentage_24h:
          coin.market_cap_change_percentage_24h || 0,
        total_supply: coin.total_supply || 0,
        max_supply: coin.max_supply || 0,
        ath: coin.ath || 0,
        ath_change_percentage: coin.ath_change_percentage || 0,
        ath_date: coin.ath_date || "",
        atl: coin.atl || 0,
        atl_change_percentage: coin.atl_change_percentage || 0,
        atl_date: coin.atl_date || "",
        roi: coin.roi || null,
        last_updated: coin.last_updated || "",
        rpoints: coin.rpoints || 0,
        total_mentions: coin.total_mentions || 0,
        data_source: coin.data_source || (coin.cmc_id ? "cmc" : "coingecko"),
      },
    });
  };

  // Simplified symbol calculation with deduplication
  const symbols = useMemo(() => {
    const coinMap = new Map<
      string,
      { symbol: string; points: number; date: string; mentions: number }
    >();
    const channels =
      selectedChannels.length > 0 ? selectedChannels : processedData.channels;
    const channelSet = new Set(channels);

    // Get latest dates for each channel
    const latestDates = new Map<string, string>();
    processedData.coinCategories.forEach((c) => {
      if (channelSet.has(c.channel)) {
        if (
          !latestDates.has(c.channel) ||
          c.date > latestDates.get(c.channel)!
        ) {
          latestDates.set(c.channel, c.date);
        }
      }
    });

    // First pass: collect all symbols and their points
    processedData.coinCategories.forEach((coin) => {
      if (!channelSet.has(coin.channel)) return;

      // Skip if not from latest date when showMostRecent is true
      if (showMostRecent && coin.date !== latestDates.get(coin.channel)) {
        return;
      }

      const symbolMatch = coin.coin.match(/\(\$([^)]+)\)/);
      const symbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";
      const cleanName = coin.coin
        .replace(/\s*\(\$[^)]+\)/g, "")
        .toLowerCase()
        .trim();
      const key = symbol || cleanName;

      const existing = coinMap.get(key);
      if (existing) {
        // Update points if current coin has higher points
        if (coin.rpoints > existing.points) {
          existing.points = coin.rpoints;
          existing.date = coin.date;
        }
        // Add total_count to mentions
        existing.mentions += coin.total_count || 1;
      } else {
        // Initialize new entry with total_count
        coinMap.set(key, {
          symbol: key,
          points: coin.rpoints,
          date: coin.date,
          mentions: coin.total_count || 1,
        });
      }
    });

    const result = Array.from(coinMap.values())
      .sort((a, b) => b.points - a.points)
      .map((item) => item.symbol);

    return result;
  }, [
    processedData.coinCategories,
    processedData.channels,
    selectedChannels,
    showMostRecent,
  ]);

  // Fetch coin data
  const { data: coinData, isFetching } = useCoinData(
    symbols,
    refreshKeyRef.current,
    "full"
  );

  // Track loaded count
  useEffect(() => {
    if (coinData?.data) {
      // Removed unused newCount variable
    }
  }, [coinData]);

  // Process coin data
  const sortedCoinData = useMemo(() => {
    const baseData = prevDataRef.current;
    if (!coinData?.data?.length) return baseData;

    const channels =
      selectedChannels.length > 0 ? selectedChannels : processedData.channels;
    const channelSet = new Set(channels);

    // Get latest date for each channel
    const latestDates = new Map<string, string>();
    processedData.coinCategories.forEach((c) => {
      if (channelSet.has(c.channel)) {
        if (
          !latestDates.has(c.channel) ||
          c.date > latestDates.get(c.channel)!
        ) {
          latestDates.set(c.channel, c.date);
        }
      }
    });

    // Calculate points and mentions per coin
    const coinStatsMap = new Map<
      string,
      { points: number; mentions: number; date: string }
    >();

    processedData.coinCategories.forEach((coin) => {
      if (!channelSet.has(coin.channel)) return;

      // Skip if not from latest date when showMostRecent is true
      if (showMostRecent && coin.date !== latestDates.get(coin.channel)) {
        return;
      }

      // Skip if outside date range
      if (dateRange.from && dateRange.to) {
        const coinDate = new Date(coin.date);
        if (coinDate < dateRange.from || coinDate > dateRange.to) {
          return;
        }
      }

      const symbolMatch = coin.coin.match(/\(\$([^)]+)\)/);
      const symbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";
      const cleanName = coin.coin
        .replace(/\s*\(\$[^)]+\)/g, "")
        .toLowerCase()
        .trim();
      const key = symbol || cleanName;

      const existing = coinStatsMap.get(key);
      if (existing) {
        // Update points if current coin has higher points
        if (coin.rpoints > existing.points) {
          existing.points = coin.rpoints;
          existing.date = coin.date;
        }
        // Add total_count to mentions only if from selected channels
        if (channelSet.has(coin.channel)) {
          existing.mentions += coin.total_count || 1;
        }
      } else {
        // Initialize new entry with total_count only if from selected channels
        coinStatsMap.set(key, {
          points: coin.rpoints,
          mentions: channelSet.has(coin.channel) ? coin.total_count || 1 : 0,
          date: coin.date,
        });
      }
    });

    // Match and sort coins
    const matchedCoins = new Set<string>();
    const result = coinData.data
      .map((coin) => {
        const cleanSymbol = coin.symbol.toLowerCase().trim();
        const cleanName = coin.name.toLowerCase().trim();
        const coinId = coin.id.toLowerCase().trim();

        if (matchedCoins.has(coinId)) return null;

        // Use exact matching like ChannelMentionsTable
        const stats =
          coinStatsMap.get(cleanSymbol) || coinStatsMap.get(cleanName);
        if (!stats) return null;

        matchedCoins.add(coinId);
        return {
          ...coin,
          rpoints: stats.points,
          total_mentions: stats.mentions,
          data_source: coin.cmc_id ? "cmc" : "coingecko",
        };
      })
      .filter((coin): coin is ExtendedCoinData => coin !== null)
      .sort((a, b) => b.rpoints - a.rpoints || b.market_cap - a.market_cap);

    prevDataRef.current = result;
    return result;
  }, [
    coinData,
    processedData.coinCategories,
    selectedChannels,
    showMostRecent,
    processedData.channels,
    dateRange,
  ]);

  const memoizedColumns = useMemo(
    () => [
      {
        accessorKey: "index",
        header: "#",
        size: 80,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[15px] text-gray-400 font-medium">
            {row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Coins",
        size: 300,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="flex items-center gap-3">
            {row.original.image && (
              <Image
                src={row.original.image}
                alt={row.original.name || ""}
                width={32}
                height={32}
                className="rounded-full w-8 h-8"
                onError={(e) => {
                  const imgElement = e.target as HTMLImageElement;
                  imgElement.style.display = "none";
                  const parent = imgElement.parentElement;
                  if (parent) {
                    const fallback = document.createElement("div");
                    fallback.innerHTML = `<svg viewBox="0 0 24 24" class="w-8 h-8 text-blue-400"><path fill="currentColor" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-3-7h6v2H9v-2zm0-3h6v2H9v-2z"/></svg>`;
                    parent.appendChild(fallback.firstChild as Node);
                  }
                }}
              />
            )}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-medium text-gray-100">
                  {row.original.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    row.original.data_source === "cmc"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {row.original.data_source === "cmc" ? "CMC" : "CG"}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {row.original.symbol?.toUpperCase()}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => {
          const price = row.original.price || row.original.current_price || 0;
          const priceChange = row.original.price_change_percentage_24h || 0;

          // Format price based on its value
          let formattedPrice;
          if (price < 0.00001) {
            formattedPrice = price.toFixed(8).replace(/\.?0+$/, "");
          } else if (price < 0.01) {
            formattedPrice = price.toFixed(6).replace(/\.?0+$/, "");
          } else if (price < 1) {
            formattedPrice = price.toFixed(4).replace(/\.?0+$/, "");
          } else if (price < 100) {
            formattedPrice = price.toFixed(2).replace(/\.?0+$/, "");
          } else {
            formattedPrice = formatCurrency(price);
          }

          return (
            <div
              className={`font-medium transition-colors duration-300 text-right ${
                priceChange > 0
                  ? "text-green-400"
                  : priceChange < 0
                  ? "text-red-400"
                  : "text-gray-100"
              }`}
            >
              ${formattedPrice}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "percent_change_24h",
        header: "24h %",
        size: 120,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => {
          const value = row.original.percent_change_24h ?? 0;
          return (
            <div
              className={`text-[15px] font-medium ${
                value >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatPercentage(value)}
            </div>
          );
        },
      },
      {
        accessorKey: "volume_24h",
        header: "24h Volume",
        size: 200,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.volume_24h)}
          </div>
        ),
      },
      {
        accessorKey: "market_cap",
        header: "Market Cap",
        size: 200,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.market_cap)}
          </div>
        ),
      },
      {
        accessorKey: "total_mentions",
        header: "Total Mentions",
        size: 150,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[15px] font-medium text-blue-300">
            {(row.original.total_mentions || 0).toLocaleString()}
          </div>
        ),
      },
    ],
    []
  );

  const onRowClick = (row: ExtendedCoinData) => {
    handleCoinSelect(row);

    // Use different ID format based on data source
    if (row.data_source === "cmc") {
      const coinId = `cmc-${row.cmc_id}`;
      router.push(`/coin/${coinId}`);
    } else {
      router.push(`/coin/${row.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {sortedCoinData.length} coins
          {isFetching && (
            <span className="ml-2 text-blue-400 inline-flex">
              <span className="w-2 text-center animate-[dots_1.4s_infinite]">
                .
              </span>
              <span className="w-2 text-center animate-[dots_1.4s_0.2s_infinite]">
                .
              </span>
              <span className="w-2 text-center animate-[dots_1.4s_0.4s_infinite]">
                .
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="w-[180px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 border-blue-500/30">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="last90days">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="MM/DD/YYYY"
                  value={
                    dateRange.from ? format(dateRange.from, "MM/dd/yyyy") : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    try {
                      const date = value ? new Date(value) : undefined;
                      if (
                        date &&
                        !isNaN(date.getTime()) &&
                        date.getFullYear() >= 1900 &&
                        date.getFullYear() <= 2100 &&
                        dateRangeInfo &&
                        date >= dateRangeInfo.earliest &&
                        date <= dateRangeInfo.latest
                      ) {
                        setDateRange((prev) => ({ ...prev, from: date }));
                      }
                    } catch (e) {
                      console.log(e);
                      // Invalid date format
                    }
                  }}
                  className="w-[140px] bg-gray-900/60 border-gray-700/50 text-gray-200 h-9 px-3 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-colors [&::-webkit-calendar-picker-indicator]:hidden"
                  onFocus={(e) => {
                    e.target.type = "date";
                    if (dateRangeInfo) {
                      e.target.min = format(
                        dateRangeInfo.earliest,
                        "yyyy-MM-dd"
                      );
                      e.target.max = format(dateRangeInfo.latest, "yyyy-MM-dd");
                    }
                  }}
                  onBlur={(e) => {
                    e.target.type = "text";
                    if (!e.target.value) {
                      e.target.placeholder = "MM/DD/YYYY";
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget
                      .previousElementSibling as HTMLInputElement;
                    input.type = "date";
                    input.showPicker();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:text-blue-400 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
              </div>

              <span className="text-gray-400">to</span>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="MM/DD/YYYY"
                  value={dateRange.to ? format(dateRange.to, "MM/dd/yyyy") : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    try {
                      const date = value ? new Date(value) : undefined;
                      if (
                        date &&
                        !isNaN(date.getTime()) &&
                        date.getFullYear() >= 1900 &&
                        date.getFullYear() <= 2100 &&
                        dateRangeInfo &&
                        date >= dateRangeInfo.earliest &&
                        date <= dateRangeInfo.latest
                      ) {
                        setDateRange((prev) => ({ ...prev, to: date }));
                      }
                    } catch (e) {
                      console.log(e);
                      // Invalid date format
                    }
                  }}
                  className="w-[140px] bg-gray-900/60 border-gray-700/50 text-gray-200 h-9 px-3 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-colors [&::-webkit-calendar-picker-indicator]:hidden"
                  onFocus={(e) => {
                    e.target.type = "date";
                    if (dateRangeInfo) {
                      e.target.min = format(
                        dateRangeInfo.earliest,
                        "yyyy-MM-dd"
                      );
                      e.target.max = format(dateRangeInfo.latest, "yyyy-MM-dd");
                    }
                  }}
                  onBlur={(e) => {
                    e.target.type = "text";
                    if (!e.target.value) {
                      e.target.placeholder = "MM/DD/YYYY";
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget
                      .previousElementSibling as HTMLInputElement;
                    input.type = "date";
                    input.showPicker();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:text-blue-400 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setShowMostRecent((prev) => !prev);
              setDateRange({ from: undefined, to: undefined });
              setDatePreset("custom");
            }}
            className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            <span>{showMostRecent ? "Show All" : "Show Most Recent"}</span>
            {showMostRecent && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl border border-gray-800/20">
        <DataTable
          columns={memoizedColumns}
          data={sortedCoinData}
          onRowClick={onRowClick}
          virtualizeRows={true}
          isLoading={isFetching}
        />
      </div>
    </div>
  );
}
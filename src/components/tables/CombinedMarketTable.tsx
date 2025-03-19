"use client";

import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCoinData } from "@/hooks/useCoinData";
import Image from "next/image";
import { DataTable } from "@/components/ui/data-table";
import type { Row } from "@tanstack/react-table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
  const [datePreset, setDatePreset] = useState<string>("custom");
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
    if (!dateRangeInfo) return;

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = subDays(today, 1);
    const lastWeek = subDays(today, 7);
    const lastMonth = subDays(today, 30);
    const last3Months = subDays(today, 90);
    const last6Months = subDays(today, 180);
    const lastYear = subDays(today, 365);

    switch (value) {
      case "today":
        setDateRange({ from: today, to: endOfDay(now) });
        break;
      case "yesterday":
        setDateRange({ from: yesterday, to: endOfDay(yesterday) });
        break;
      case "last7days":
        setDateRange({ from: lastWeek, to: endOfDay(now) });
        break;
      case "last30days":
        setDateRange({ from: lastMonth, to: endOfDay(now) });
        break;
      case "last90days":
        setDateRange({ from: last3Months, to: endOfDay(now) });
        break;
      case "last180days":
        setDateRange({ from: last6Months, to: endOfDay(now) });
        break;
      case "last365days":
        setDateRange({ from: lastYear, to: endOfDay(now) });
        break;
      case "all":
        setDateRange({
          from: dateRangeInfo.earliest,
          to: dateRangeInfo.latest,
        });
        break;
      case "custom":
        setDateRange({ from: undefined, to: undefined });
        break;
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
        // Add total_count to mentions with fallback to 1
        existing.mentions += coin.total_count ?? 1;
      } else {
        // Initialize new entry with total_count fallback to 1
        coinStatsMap.set(key, {
          points: coin.rpoints,
          mentions: coin.total_count ?? 1,
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

        const stats =
          coinStatsMap.get(cleanSymbol) || coinStatsMap.get(cleanName);
        if (stats) {
          matchedCoins.add(coinId);
          return {
            ...coin,
            rpoints: stats.points,
            total_mentions: stats.mentions,
          };
        }

        return null;
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
              <span className="text-[15px] font-medium text-gray-100">
                {row.original.name}
              </span>
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
        size: 150,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.price)}
          </div>
        ),
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
                <SelectItem value="last180days">Last 180 days</SelectItem>
                <SelectItem value="last365days">Last 365 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {datePreset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 border-blue-500/30"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} -{" "}
                          {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd")
                      )
                    ) : (
                      "Select dates"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range: DateRange | undefined) => {
                      if (range) setDateRange(range);
                    }}
                    numberOfMonths={2}
                    className="bg-gray-800 border-gray-700"
                    disabled={(date) => {
                      if (!dateRangeInfo) return false;
                      return (
                        date < dateRangeInfo.earliest ||
                        date > dateRangeInfo.latest
                      );
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
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
          onRowClick={(row) => {
            handleCoinSelect(row);
            router.push(`/coin/${row.coingecko_id}`);
          }}
          virtualizeRows={true}
          isLoading={isFetching}
        />
      </div>
    </div>
  );
}

"use client";

import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCoinData } from "@/hooks/useCoinData";
import Image from "next/image";
import { DataTable } from "@/components/ui/data-table";
import type { Row } from "@tanstack/react-table";

type ExtendedCoinData = CoinData & { rpoints: number };

interface CoinCategoryData {
  channel: string;
  date: string;
  coin: string;
  rpoints: number;
  categories: string[];
}

interface ProcessedData {
  projectDistribution: { name: string; value: number }[];
  projectTrends: Map<string, { date: string; rpoints: number }[]>;
  categoryDistribution: { name: string; value: number }[];
  coinCategories: CoinCategoryData[];
  channels: string[];
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
  const [showMostRecent, setShowMostRecent] = useState(false);
  const refreshKeyRef = useRef(0);
  const prevDataRef = useRef<ExtendedCoinData[]>([]);

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
      },
    });
  };

  // Simplified symbol calculation with deduplication
  const symbols = useMemo(() => {
    const coinMap = new Map<
      string,
      { symbol: string; points: number; date: string }
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
      if (!existing || coin.rpoints > existing.points) {
        coinMap.set(key, {
          symbol: key,
          points: coin.rpoints,
          date: coin.date,
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

  // Debug coin data updates and track loaded count
  useEffect(() => {
    if (coinData?.data) {
      const newCount = coinData.loadedCount ?? coinData.data.length;
      console.debug("Loaded coins:", newCount);
    }
  }, [coinData]);

  // Process coin data with debug
  const sortedCoinData = useMemo(() => {
    const baseData = prevDataRef.current;
    if (!coinData?.data?.length) return baseData;

    const channels =
      selectedChannels.length > 0 ? selectedChannels : processedData.channels;
    const channelSet = new Set(channels);

    // Get latest dates
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

    // Calculate points per coin
    const rpointsMap = new Map<string, { points: number; date: string }>();
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

      const existing = rpointsMap.get(key);
      if (!existing || coin.rpoints > existing.points) {
        rpointsMap.set(key, {
          points: coin.rpoints,
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

        const pointsData =
          rpointsMap.get(cleanSymbol) || rpointsMap.get(cleanName);
        if (pointsData) {
          matchedCoins.add(coinId);
          return { ...coin, rpoints: pointsData.points };
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
        <button
          onClick={() => {
            setShowMostRecent((prev) => !prev);
          }}
          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 flex items-center gap-2"
        >
          <span>{showMostRecent ? "Show All" : "Show Most Recent"}</span>
          {showMostRecent && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
        </button>
      </div>
      <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl border border-gray-800/20">
        <DataTable
          columns={memoizedColumns}
          data={sortedCoinData}
          onRowClick={handleCoinSelect}
          virtualizeRows={true}
          isLoading={isFetching}
        />
      </div>
    </div>
  );
}

"use client";

import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCoinData } from "@/hooks/useCoinData";
import Image from "next/image";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

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
  onCoinSelect: (coin: {
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
  const [isReloading, setIsReloading] = useState(false);
  const prevSymbolsRef = useRef<string[]>([]);

  // Get symbols for all coins
  const symbols = useMemo(() => {
    const relevantCoins = new Map<string, number>();

    // Calculate latest dates for all channels first
    const latestDates = new Map<string, number>();
    if (showMostRecent) {
      processedData.coinCategories.forEach((c) => {
        if (selectedChannels.includes(c.channel)) {
          const date = new Date(c.date).getTime();
          const existingDate = latestDates.get(c.channel);
          if (!existingDate || date > existingDate) {
            latestDates.set(c.channel, date);
          }
        }
      });
    }

    selectedChannels.forEach((channel) => {
      processedData.coinCategories.forEach((coin: CoinCategoryData) => {
        if (coin.channel === channel) {
          if (showMostRecent) {
            const latestDate = latestDates.get(channel);
            if (new Date(coin.date).getTime() === latestDate) {
              relevantCoins.set(
                coin.coin,
                (relevantCoins.get(coin.coin) || 0) + coin.rpoints
              );
            }
          } else {
            relevantCoins.set(
              coin.coin,
              (relevantCoins.get(coin.coin) || 0) + coin.rpoints
            );
          }
        }
      });
    });

    return Array.from(relevantCoins.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([coin]) => coin);
  }, [processedData.coinCategories, selectedChannels, showMostRecent]);

  // Update symbols ref and handle loading state
  useEffect(() => {
    if (
      prevSymbolsRef.current.length !== symbols.length ||
      symbols.some((s, i) => prevSymbolsRef.current[i] !== s)
    ) {
      setIsReloading(true);
      prevSymbolsRef.current = symbols;
    }
  }, [symbols, setIsReloading, isReloading]);

  const { data: coinData, isLoading } = useCoinData(prevSymbolsRef.current);

  // Clear loading state when data arrives
  useEffect(() => {
    if (coinData && isReloading) {
      setIsReloading(false);
    }
  }, [coinData, isReloading]);

  // Sort coin data
  const sortedCoinData = useMemo(() => {
    if (!coinData) return [] as ExtendedCoinData[];

    const uniqueCoins = new Map<string, ExtendedCoinData>();

    // Calculate latest dates for all channels first
    const latestDates = new Map<string, number>();
    if (showMostRecent) {
      processedData.coinCategories.forEach((c) => {
        if (selectedChannels.includes(c.channel)) {
          const date = new Date(c.date).getTime();
          const existingDate = latestDates.get(c.channel);
          if (!existingDate || date > existingDate) {
            latestDates.set(c.channel, date);
          }
        }
      });
    }

    coinData.data?.forEach((coin: CoinData) => {
      const matchingCoins = processedData.coinCategories.filter((cat) => {
        if (!selectedChannels.includes(cat.channel)) return false;
        if (showMostRecent) {
          const latestDate = latestDates.get(cat.channel);
          if (new Date(cat.date).getTime() !== latestDate) return false;
        }
        return (
          cat.coin.toLowerCase() === coin.symbol.toLowerCase() ||
          cat.coin.toLowerCase() === coin.name.toLowerCase() ||
          cat.coin.toLowerCase().includes(coin.symbol.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(cat.coin.toLowerCase())
        );
      });

      const totalRpoints = matchingCoins.reduce(
        (sum, cat) => sum + cat.rpoints,
        0
      );
      uniqueCoins.set(coin.coingecko_id, {
        ...coin,
        rpoints: totalRpoints,
      });
    });

    return Array.from(uniqueCoins.values()).sort((a, b) => {
      if (b.rpoints !== a.rpoints) return b.rpoints - a.rpoints;
      return b.market_cap - a.market_cap;
    });
  }, [
    coinData,
    processedData.coinCategories,
    selectedChannels,
    showMostRecent,
  ]);

  const columns: ColumnDef<ExtendedCoinData>[] = [
    {
      accessorKey: "index",
      header: "#",
      size: 80,
      cell: ({ row }) => (
        <div className="text-[15px] text-gray-400 font-medium">
          {row.index + 1}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Coins",
      size: 300,
      cell: ({ row }) => (
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
      cell: ({ row }) => (
        <div className="text-[15px] font-medium text-gray-100">
          {formatCurrency(row.original.price)}
        </div>
      ),
    },
    {
      accessorKey: "percent_change_24h",
      header: "24h %",
      size: 120,
      cell: ({ row }) => (
        <div
          className={`text-[15px] font-medium ${
            row.original.percent_change_24h >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {formatPercentage(row.original.percent_change_24h)}
        </div>
      ),
    },
    {
      accessorKey: "volume_24h",
      header: "24h Volume",
      size: 200,
      cell: ({ row }) => (
        <div className="text-[15px] font-medium text-gray-100">
          {formatCurrency(row.original.volume_24h)}
        </div>
      ),
    },
    {
      accessorKey: "market_cap",
      header: "Market Cap",
      size: 200,
      cell: ({ row }) => (
        <div className="text-[15px] font-medium text-gray-100">
          {formatCurrency(row.original.market_cap)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {sortedCoinData.length} coins
        </div>
        <button
          onClick={() => setShowMostRecent((prev) => !prev)}
          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 flex items-center gap-2"
        >
          <span>{showMostRecent ? "Show All" : "Show Most Recent"}</span>
          {showMostRecent && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
        </button>
      </div>
      {isLoading || isReloading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl p-6 border border-gray-800/20">
          <DataTable
            columns={columns}
            data={sortedCoinData}
            onRowClick={(data) =>
              onCoinSelect({
                symbol: data.coingecko_id,
                coingecko_id: data.coingecko_id,
                data,
              })
            }
            virtualizeRows={true}
          />
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl p-6 overflow-x-auto border border-gray-800/20">
      <div className="min-w-[900px] w-full">
        <div className="w-full">
          <div className="bg-gray-800/30 py-4 grid grid-cols-6 gap-4">
            {["#", "Coin", "Price", "24h %", "24h Volume", "Market Cap"].map(
              (header) => (
                <div
                  key={header}
                  className="px-4 text-left text-xs font-medium text-cyan-200 uppercase tracking-wider"
                >
                  {header}
                </div>
              )
            )}
          </div>
          <div className="divide-y divide-gray-700/30 bg-gray-800/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse grid grid-cols-6 gap-4 py-5"
              >
                <div className="px-4">
                  <Skeleton className="h-5 w-8 bg-gray-800/50" />
                </div>
                <div className="px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-gray-800/50" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-5 w-24 bg-gray-800/50" />
                      <Skeleton className="h-4 w-16 bg-gray-800/50" />
                    </div>
                  </div>
                </div>
                <div className="px-4">
                  <Skeleton className="h-5 w-20 bg-gray-800/50" />
                </div>
                <div className="px-4">
                  <Skeleton className="h-5 w-16 bg-gray-800/50" />
                </div>
                <div className="px-4">
                  <Skeleton className="h-5 w-24 bg-gray-800/50" />
                </div>
                <div className="px-4">
                  <Skeleton className="h-5 w-24 bg-gray-800/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

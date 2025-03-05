"use client";

import { ColumnDef, Row, CellContext } from "@tanstack/react-table";
import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCoinData } from "@/hooks/useCoinData";
import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DataTable } from "@/components/ui/data-table";

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
  }, [symbols]);

  const { data: coinData, isLoading } = useCoinData(prevSymbolsRef.current);

  // Clear loading state when data arrives
  useEffect(() => {
    if (coinData && isReloading) {
      setIsReloading(false);
    }
  }, [coinData]);

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

    coinData.forEach((coin: CoinData) => {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {sortedCoinData.length} coins
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
      {isLoading || isReloading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl p-6 overflow-x-auto border border-gray-800/20">
          <div className="min-w-[900px] w-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
                <tr>
                  <th className="py-4 text-left text-sm font-medium text-white px-4 w-[40px]">
                    #
                  </th>
                  <th className="py-4 text-left text-sm font-medium text-white px-4 w-[200px]">
                    Coin
                  </th>
                  <th className="py-4 text-left text-sm font-medium text-white px-4 w-[120px]">
                    Price
                  </th>
                  <th className="py-4 text-left text-sm font-medium text-white px-4 w-[100px]">
                    24h %
                  </th>
                  <th className="py-4 text-left text-sm font-medium text-white px-4 w-[150px]">
                    24h Volume
                  </th>
                  <th className="py-4 text-left text-sm font-medium text-white px-4 w-[150px]">
                    Market Cap
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCoinData.map((row, index) => (
                  <tr
                    key={row.coingecko_id}
                    className="hover:bg-blue-500/5 transition-colors cursor-pointer"
                    onClick={() =>
                      onCoinSelect({
                        symbol: row.coingecko_id,
                        coingecko_id: row.coingecko_id,
                        data: row,
                      })
                    }
                  >
                    <td className="py-5 px-4 w-[40px]">
                      <div className="text-[15px] text-gray-400 font-medium">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-5 px-4 w-[200px]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="flex items-center gap-3">
                            {row.image && (
                              <Image
                                src={row.image}
                                alt={row.name || ""}
                                width={32}
                                height={32}
                                className="rounded-full w-8 h-8"
                                onError={(e) => {
                                  const imgElement =
                                    e.target as HTMLImageElement;
                                  imgElement.style.display = "none";
                                  const parent = imgElement.parentElement;
                                  if (parent) {
                                    const fallback =
                                      document.createElement("div");
                                    fallback.innerHTML = `<svg viewBox="0 0 24 24" class="w-8 h-8 text-blue-400"><path fill="currentColor" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-3-7h6v2H9v-2zm0-3h6v2H9v-2z"/></svg>`;
                                    parent.appendChild(
                                      fallback.firstChild as Node
                                    );
                                  }
                                }}
                              />
                            )}
                            <div className="flex flex-col items-start">
                              <span className="text-[15px] font-medium text-gray-100">
                                {row.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {row.symbol?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-[15px] font-semibold">
                              {row.name}
                            </h4>
                            <div className="text-sm space-y-1">
                              <p>
                                Market Cap:{" "}
                                {formatCurrency(row.market_cap || 0)}
                              </p>
                              <p>
                                Volume (24h):{" "}
                                {formatCurrency(row.volume_24h || 0)}
                              </p>
                              <p>
                                Circulating Supply:{" "}
                                {row.circulating_supply?.toLocaleString() || 0}{" "}
                                {row.symbol?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="py-5 px-4 w-[120px]">
                      <div className="text-[15px] font-medium text-gray-100">
                        {formatCurrency(row.price)}
                      </div>
                    </td>
                    <td className="py-5 px-4 w-[100px]">
                      <div
                        className={`text-[15px] font-medium ${
                          row.percent_change_24h >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(row.percent_change_24h)}
                      </div>
                    </td>
                    <td className="py-5 px-4 w-[150px]">
                      <div className="text-[15px] font-medium text-gray-100">
                        {formatCurrency(row.volume_24h)}
                      </div>
                    </td>
                    <td className="py-5 px-4 w-[150px]">
                      <div className="text-[15px] font-medium text-gray-100">
                        {formatCurrency(row.market_cap)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl p-6 overflow-x-auto border border-gray-800/20">
      <div className="min-w-[900px] w-full">
        <Table className="[&_*]:border-0 [&_td]:py-5 [&_th]:py-4 [&_td]:text-[15px] [&_th]:text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px] text-gray-400 font-medium">
                #
              </TableHead>
              <TableHead className="w-[200px] text-gray-400 font-medium">
                Coin
              </TableHead>
              <TableHead className="w-[120px] text-gray-400 font-medium">
                Price
              </TableHead>
              <TableHead className="w-[100px] text-gray-400 font-medium">
                24h %
              </TableHead>
              <TableHead className="w-[150px] text-gray-400 font-medium">
                24h Volume
              </TableHead>
              <TableHead className="w-[150px] text-gray-400 font-medium">
                Market Cap
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="animate-pulse">
                <TableCell className="w-[40px]">
                  <div className="text-[15px] text-gray-400 font-medium">
                    {i + 1}
                  </div>
                </TableCell>
                <TableCell className="w-[200px]">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-gray-800/50" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-5 w-24 bg-gray-800/50" />
                      <Skeleton className="h-4 w-16 bg-gray-800/50" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-5 w-20 bg-gray-800/50" />
                </TableCell>
                <TableCell className="w-[100px]">
                  <Skeleton className="h-5 w-16 bg-gray-800/50" />
                </TableCell>
                <TableCell className="w-[150px]">
                  <Skeleton className="h-5 w-24 bg-gray-800/50" />
                </TableCell>
                <TableCell className="w-[150px]">
                  <Skeleton className="h-5 w-24 bg-gray-800/50" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

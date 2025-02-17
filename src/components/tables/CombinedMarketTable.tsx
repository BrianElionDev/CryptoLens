"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useEffect } from "react";
import { useCoinData } from "@/hooks/useCoinData";
import Image from "next/image";

interface ProcessedData {
  projectDistribution: { name: string; value: number }[];
  projectTrends: Map<string, { date: string; rpoints: number }[]>;
  categoryDistribution: { name: string; value: number }[];
  coinCategories: {
    coin: string;
    categories: string[];
    channel: string;
    rpoints: number;
  }[];
  channels: string[];
}

interface CombinedMarketTableProps {
  processedData: ProcessedData;
  selectedChannels: string[];
  onCoinSelect: (coin: {
    symbol: string;
    coingecko_id: string;
    data: CoinData;
  }) => void;
}

export function CombinedMarketTable({
  processedData,
  selectedChannels,
  onCoinSelect,
}: CombinedMarketTableProps) {
  const symbols = useMemo(() => {
    return processedData.projectDistribution
      .filter((project) =>
        processedData.coinCategories.some(
          (coin) =>
            coin.coin === project.name &&
            selectedChannels.includes(coin.channel)
        )
      )
      .map((project) => project.name);
  }, [processedData, selectedChannels]);

  const { data: coinData, isLoading, refetch } = useCoinData(symbols);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const columns: ColumnDef<CoinData>[] = [
    {
      accessorKey: "rank",
      header: "#",
      cell: ({ row }) => {
        return (
          <div className="w-[40px] text-[15px] text-gray-400 font-medium">
            {row.index + 1}
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: () => <div className="text-white font-medium">Coin</div>,
      cell: ({ row }) => {
        const coin = row.original;
        return (
          <div className="w-[200px]">
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-3">
                  {coin?.image && (
                    <Image
                      src={coin.image}
                      alt={coin.name || ""}
                      width={32}
                      height={32}
                      className="rounded-full w-8 h-8"
                    />
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-gray-100">
                      {coin?.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {coin?.symbol?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-[15px] font-semibold">{coin?.name}</h4>
                  <div className="text-sm space-y-1">
                    <p>Market Cap: {formatCurrency(coin?.market_cap || 0)}</p>
                    <p>Volume (24h): {formatCurrency(coin?.volume_24h || 0)}</p>
                    <p>
                      Circulating Supply:{" "}
                      {coin?.circulating_supply?.toLocaleString() || 0}{" "}
                      {coin?.symbol?.toUpperCase()}
                    </p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: () => <div className="text-white font-medium">Price</div>,
      cell: ({ row }) => {
        return (
          <div className="w-[120px] text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.price)}
          </div>
        );
      },
    },
    {
      accessorKey: "percent_change_24h",
      header: () => <div className="text-white font-medium">24h %</div>,
      cell: ({ row }) => {
        const value = row.original.percent_change_24h;
        return (
          <div
            className={`w-[100px] text-[15px] font-medium ${
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
      header: () => <div className="text-white font-medium">24h Volume</div>,
      cell: ({ row }) => {
        return (
          <div className="w-[150px] text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.volume_24h)}
          </div>
        );
      },
    },
    {
      accessorKey: "market_cap",
      header: () => <div className="text-white font-medium">Market Cap</div>,
      cell: ({ row }) => {
        return (
          <div className="w-[150px] text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.market_cap)}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl p-6 overflow-x-auto border border-gray-800/20">
      <div className="min-w-[900px] w-full [&_table]:divide-y-0 [&_tr:hover]:bg-blue-500/5 [&_tr]:transition-colors [&_td]:py-5 [&_th]:py-4 [&_td]:text-[15px] [&_th]:text-sm [&_*]:border-0 [&_*]:outline-none [&_tr]:cursor-pointer">
        <DataTable
          columns={columns}
          data={coinData || []}
          onRowClick={(row: CoinData) => {
            onCoinSelect({
              symbol: row.coingecko_id,
              coingecko_id: row.coingecko_id,
              data: row,
            });
          }}
        />
      </div>
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

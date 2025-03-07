"use client";

import { useState, useMemo, useEffect } from "react";
import { useCoinHistory, useCoinData } from "@/hooks/useCoinData";
import type { CoinData } from "@/hooks/useCoinData";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Coins,
  CoinsIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Image from "next/image";

interface CoinDetailsModalProps {
  coingecko_id: string;
  data: CoinData;
  onClose: () => void;
}

export default function CoinDetailsModal({
  coingecko_id,
  data: initialData,
  onClose,
}: CoinDetailsModalProps) {
  const [timeframe, setTimeframe] = useState("1");
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((key) => key + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Use the coin data hook directly for live updates
  const { data: liveData } = useCoinData([coingecko_id], refreshKey);
  const { data: chartData, isLoading: isLoadingChart } = useCoinHistory(
    coingecko_id,
    timeframe
  );

  // Use the latest data or fall back to initial data
  const displayData = useMemo(() => {
    if (liveData?.data?.[0]) {
      return liveData.data[0];
    }
    return initialData;
  }, [liveData, initialData]);

  const isLoading = isLoadingChart;

  // Format chart data
  const formattedChartData = useMemo(() => {
    if (!chartData) return [];
    return chartData.map((point) => ({
      date: point.date,
      price: point.price,
    }));
  }, [chartData]);

  const getChartColor = () => {
    switch (timeframe) {
      case "price":
        return "rgb(59, 130, 246)"; // blue
      case "market_cap":
        return "rgb(168, 85, 247)"; // purple
      case "volume":
        return "rgb(236, 72, 153)"; // pink
      default:
        return "rgb(59, 130, 246)"; // default blue
    }
  };

  if (!displayData) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl lg:max-w-3xl xl:max-w-4xl p-0 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-gray-800/50"
        >
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-3xl xl:max-w-4xl p-0 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-gray-800/50 [&>button]:p-2 [&>button]:text-white [&>button]:rounded-lg [&>button]:bg-gray-800/50 [&>button]:hover:bg-gray-700/50 [&>button]:transition-colors [&>button]:absolute [&>button]:right-6 [&>button]:top-6"
        aria-describedby="coin-details-description"
      >
        <div className="h-full flex flex-col">
          <SheetHeader className="flex-none p-6 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <div className="flex items-center gap-3">
                  {displayData.image ? (
                    <div className="relative w-8 h-8">
                      <Image
                        src={displayData.image}
                        alt={displayData.name}
                        fill
                        className="rounded-full object-cover"
                        sizes="40px"
                        onError={(e) => {
                          // Remove the errored image
                          const imgElement = e.target as HTMLImageElement;
                          imgElement.style.display = "none";
                          // Show the fallback icon
                          const parent = imgElement.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.innerHTML = `<svg viewBox="0 0 24 24" class="w-8 h-8 text-blue-400"><path fill="currentColor" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-3-7h6v2H9v-2zm0-3h6v2H9v-2z"/></svg>`;
                            parent.appendChild(fallback.firstChild as Node);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <CoinsIcon className="w-8 h-8 text-blue-400" />
                  )}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                    {displayData.name} ({displayData.symbol.toUpperCase()})
                  </span>
                </div>
              </SheetTitle>
            </div>
          </SheetHeader>
          <div id="coin-details-description" className="sr-only">
            Detailed information about {displayData.name} including price,
            market cap, 24h change, and price history
          </div>

          <div className="flex-1 pt-6 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-gray-800/50 space-y-6 px-6 pb-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                    Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-gray-200">
                    $
                    {displayData.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Market Cap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-gray-200">
                    ${displayData.market_cap.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    {displayData.percent_change_24h >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    24h Change
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl font-bold ${
                      displayData.percent_change_24h >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {displayData.percent_change_24h.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-pink-400" />
                    Circulating Supply
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-gray-200">
                    {displayData.circulating_supply.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Section */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-200">Price Chart</CardTitle>
                  <Tabs defaultValue={timeframe} onValueChange={setTimeframe}>
                    <TabsList className="bg-gray-900/60">
                      <TabsTrigger value="1">24h</TabsTrigger>
                      <TabsTrigger value="7">7d</TabsTrigger>
                      <TabsTrigger value="30">30d</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/50 backdrop-blur-sm rounded-lg z-10">
                      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-sm text-gray-400">
                        Loading chart data...
                      </p>
                    </div>
                  ) : chartData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formattedChartData}>
                        <defs>
                          <linearGradient
                            id="colorPrice"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={getChartColor()}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={getChartColor()}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#2d374850"
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => {
                            const d = new Date(date);
                            return timeframe === "1"
                              ? d.toLocaleTimeString()
                              : d.toLocaleDateString();
                          }}
                          stroke="#94a3b8"
                        />
                        <YAxis
                          dataKey="price"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              notation: "compact",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            }).format(value)
                          }
                          stroke="#94a3b8"
                          domain={["auto", "auto"]}
                          scale="linear"
                          padding={{ top: 20, bottom: 20 }}
                          width={80}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          tickCount={6}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload?.[0]?.value) {
                              return (
                                <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-3 backdrop-blur-sm">
                                  <p className="text-gray-200">
                                    {new Date(label).toLocaleString()}
                                  </p>
                                  <p className="text-blue-400 font-medium">
                                    {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    }).format(Number(payload[0].value))}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={getChartColor()}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
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
  X,
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

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  percent_change_24h: number;
  circulating_supply: number;
  image?: string;
  coingecko_id?: string;
}

interface ChartData {
  data: {
    date: string;
    price: number;
  }[];
}

interface CoinDetailsModalProps {
  coingecko_id: string;
  data: CoinData;
  onClose: () => void;
}

export default function CoinDetailsModal({
  coingecko_id,
  data: coinData,
  onClose,
}: CoinDetailsModalProps) {
  const [timeframe, setTimeframe] = useState("1"); // Default to 24h
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch chart data
  const fetchChartData = useCallback(
    async (timeframe: string) => {
      setIsLoading(true);
      setChartData(null);
      setError(null);

      try {
        const response = await fetch(
          `/api/coin/${encodeURIComponent(
            coingecko_id
          )}/history?days=${timeframe}`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to fetch data" }));
          throw new Error(errorData.error || "Failed to fetch data");
        }

        const json = await response.json();

        if (json.error) {
          throw new Error(json.error);
        }

        if (json.data) {
          setChartData(json);
          setError(null);
        } else {
          throw new Error("No data received");
        }
      } catch (err: unknown) {
        console.error("Error fetching chart data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    },
    [coingecko_id]
  );

  // Initial fetch and timeframe changes
  useEffect(() => {
    if (coingecko_id) {
      fetchChartData(timeframe);
    }
  }, [coingecko_id, fetchChartData, timeframe]);

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

  if (!coinData) {
    return (
      <Sheet open={true}>
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
    <Sheet open={true}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-3xl xl:max-w-4xl p-0 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-gray-800/50"
      >
        <div className="h-full flex flex-col">
          <SheetHeader className="flex-none p-6 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <div className="flex items-center gap-3">
                  {coinData.image ? (
                    <div className="relative w-8 h-8">
                      <Image
                        src={coinData.image}
                        alt={coinData.name}
                        fill
                        className="rounded-full object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <CoinsIcon className="w-8 h-8 text-blue-400" />
                  )}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                    {coinData.name} ({coinData.symbol.toUpperCase()})
                  </span>
                </div>
              </SheetTitle>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </SheetHeader>

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
                    {coinData.price.toLocaleString(undefined, {
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
                    ${coinData.market_cap.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    {coinData.percent_change_24h >= 0 ? (
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
                      coinData.percent_change_24h >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {coinData.percent_change_24h.toLocaleString(undefined, {
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
                    {coinData.circulating_supply.toLocaleString()}
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
                  ) : error ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-red-400">{error}</p>
                    </div>
                  ) : chartData?.data ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.data}>
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

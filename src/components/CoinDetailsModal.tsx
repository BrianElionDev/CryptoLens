"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Coins,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { date: Date; value: number };
  }>;
  label?: string | number;
}

interface CoinDetailsModalProps {
  symbol: string;
  coinData: CoinData;
  isModal?: boolean;
}

export default function CoinDetailsModal({
  symbol,
  coinData,
  isModal = true,
}: CoinDetailsModalProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1"); // days
  const [selectedMetric, setSelectedMetric] = useState<
    "price" | "market_cap" | "volume"
  >("price");

  // Function to fetch chart data
  const fetchChartData = useCallback(
    async (timeframe: string) => {
      setIsChartLoading(true);
      setChartData(null);
      setError(null);

      try {
        const response = await fetch(
          `/api/coin/${encodeURIComponent(
            coinData?.coingecko_id || symbol.toLowerCase()
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
          setChartData(json.data);
          setError(null);
        } else {
          throw new Error("No data received");
        }
      } catch (err: unknown) {
        console.error("Error fetching chart data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setIsChartLoading(false);
      }
    },
    [coinData?.coingecko_id, symbol]
  );

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    fetchChartData(timeframe);
  };

  // Handle retry
  const handleRetry = () => {
    fetchChartData(selectedTimeframe);
  };

  // Initial fetch and timeframe changes
  useEffect(() => {
    if (coinData?.coingecko_id) {
      fetchChartData(selectedTimeframe);
    }

    return () => {
      // Cleanup
      setChartData(null);
      setError(null);
      setIsChartLoading(false);
    };
  }, [coinData?.coingecko_id, fetchChartData, selectedTimeframe]);

  const formatChartData = (data: [number, number][]) => {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data
      .map(([timestamp, value]) => ({
        date: timestamp,
        value: value,
      }))
      .filter(
        (point) =>
          point.value !== null &&
          point.value !== undefined &&
          !isNaN(point.value)
      );
  };

  const getChartData = () => {
    if (!chartData) return [];

    const data = (() => {
      switch (selectedMetric) {
        case "price":
          return chartData.prices ? formatChartData(chartData.prices) : [];
        case "market_cap":
          return chartData.market_caps
            ? formatChartData(chartData.market_caps)
            : [];
        case "volume":
          return chartData.total_volumes
            ? formatChartData(chartData.total_volumes)
            : [];
        default:
          return [];
      }
    })();

    return data;
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length && label) {
      const value = payload[0].value;
      let formattedValue = "";

      switch (selectedMetric) {
        case "price":
          formattedValue = formatNumber(value, "price");
          break;
        case "market_cap":
          formattedValue = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 2,
          }).format(value);
          break;
        case "volume":
          formattedValue = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 2,
          }).format(value);
          break;
      }

      return (
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-gray-200">{new Date(label).toLocaleString()}</p>
          <p className="text-blue-400 font-medium">{formattedValue}</p>
        </div>
      );
    }
    return null;
  };

  const getChartColor = () => {
    switch (selectedMetric) {
      case "price":
        return "rgb(59, 130, 246)"; // blue
      case "market_cap":
        return "rgb(168, 85, 247)"; // purple
      case "volume":
        return "rgb(236, 72, 153)"; // pink
    }
  };

  const getChartConfig = () => {
    const color = getChartColor();
    return {
      gradientId: `color${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      }`,
      stroke: color,
      fill: color,
    };
  };

  const formatYAxisTick = (value: number) => {
    if (value >= 1e9) {
      return `$ ${(value / 1e9).toFixed(1)}B`;
    }
    if (value >= 1e6) {
      return `$ ${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
      return `$ ${(value / 1e3).toFixed(1)}K`;
    }
    return `$ ${value.toFixed(1)}`;
  };

  return (
    <div className={`${isModal ? "px-4 py-2" : "p-6 pt-28"} space-y-4`}>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm p-4">
          <div className="flex items-center gap-4">
            {coinData?.image ? (
              <Image
                src={coinData.image}
                alt={coinData.name}
                width={60}
                height={60}
                className="rounded-full"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-2xl text-blue-300">
                  {symbol.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-200 truncate">
                  {coinData?.name || symbol.toUpperCase()}
                </h1>
                <span className="px-3 py-1 text-sm rounded-full bg-blue-500/20 text-blue-300">
                  {coinData?.symbol.toUpperCase() || "Loading..."}
                </span>
              </div>
              {coinData && (
                <div className="mt-2 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-xl font-bold text-gray-200">
                      ${formatNumber(coinData.price, "price")}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      coinData.percent_change_24h <= 0
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {coinData.percent_change_24h <= 0 ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {formatNumber(
                        Math.abs(coinData.percent_change_24h),
                        "percentage"
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-medium text-gray-200">
                  Market Cap
                </h3>
              </div>
              <p className="text-xl font-bold text-gray-200">
                ${new Intl.NumberFormat("en-US").format(coinData.market_cap)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-medium text-gray-200">
                  24h Volume
                </h3>
              </div>
              <p className="text-xl font-bold text-gray-200">
                ${new Intl.NumberFormat("en-US").format(coinData.volume_24h)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <Coins className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-medium text-gray-200">
                  Circulating Supply
                </h3>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-gray-200">
                  {new Intl.NumberFormat("en-US").format(
                    coinData.circulating_supply
                  )}
                </p>
                <p className="text-sm text-gray-400">
                  {coinData?.symbol.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-4 backdrop-blur-sm">
            <div className="flex flex-col h-[400px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                  {[
                    { id: "price", label: "Price" },
                    { id: "market_cap", label: "Market Cap" },
                    { id: "volume", label: "Volume" },
                  ].map((metric) => (
                    <button
                      key={metric.id}
                      onClick={() =>
                        setSelectedMetric(metric.id as typeof selectedMetric)
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedMetric === metric.id
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                  {["1", "7", "30"].map((days) => (
                    <button
                      key={days}
                      onClick={() => handleTimeframeChange(days)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedTimeframe === days
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      {days === "1" ? "24h" : `${days}d`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 relative">
                {isChartLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-sm text-gray-400">
                        Loading chart data...
                      </p>
                    </div>
                  </div>
                )}
                {!isChartLoading && error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center px-4">
                      <div className="p-3 rounded-full bg-red-500/10">
                        <svg
                          className="w-6 h-6 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-400">
                          {error.includes("429")
                            ? "Rate limit exceeded. Please try again later."
                            : "Error Loading Chart"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {error.includes("429")
                            ? "Too many requests. The chart data will be available again shortly."
                            : error}
                        </p>
                        <button
                          onClick={handleRetry}
                          className="mt-4 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm rounded-lg transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!isChartLoading && !error && getChartData().length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm text-gray-400">No data available</p>
                    </div>
                  </div>
                )}
                {!isChartLoading && !error && getChartData().length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={getChartData()}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id={getChartConfig().gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={getChartConfig().fill}
                            stopOpacity={0.1}
                          />
                          <stop
                            offset="95%"
                            stopColor={getChartConfig().fill}
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        type="number"
                        scale="time"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(timestamp) => {
                          const date = new Date(timestamp);
                          return selectedTimeframe === "1"
                            ? date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : date.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              });
                        }}
                        stroke="#4B5563"
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                        fontSize={12}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickFormatter={formatYAxisTick}
                        stroke="#4B5563"
                        tickLine={false}
                        axisLine={false}
                        width={80}
                        fontSize={12}
                        tickCount={6}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={getChartConfig().stroke}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#${getChartConfig().gradientId})`}
                        isAnimationActive={false}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

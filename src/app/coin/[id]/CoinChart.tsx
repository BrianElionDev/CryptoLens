"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createChart,
  ColorType,
  PriceScaleMode,
  IChartApi,
  CandlestickSeries,
} from "lightweight-charts";

interface CoinChartProps {
  coingecko_id: string;
  cmc_id?: string;
  data_source?: string;
}

interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CoinHistoryData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

async function getCoinHistory(id: string, days: string) {
  const response = await fetch(`/api/coins/${id}/history?days=${days}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch history");
  }
  return response.json();
}

export default function CoinChart({
  coingecko_id,
  data_source,
}: Omit<CoinChartProps, "cmc_id">) {
  const [timeframe, setTimeframe] = useState("1");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [days, setDays] = useState("1");

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    setDays(value);
  };

  const {
    data: chartData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["coin-history", coingecko_id, days],
    queryFn: () => getCoinHistory(coingecko_id, days),
    staleTime: 60 * 1000,
    retry: 2,
    enabled: !!coingecko_id && data_source !== "cmc",
  });

  useEffect(() => {
    if (!chartContainerRef.current || !chartData) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 12,
        barSpacing: 12,
        minBarSpacing: 4,
        rightBarStaysOnScroll: true,
        borderColor: "#1f2937",
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.3,
          bottom: 0.25,
        },
        mode: PriceScaleMode.Normal,
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#94a3b8",
          width: 1,
          style: 3,
        },
        horzLine: {
          color: "#94a3b8",
          width: 1,
          style: 3,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const candlestickData = chartData.map(
      (item: CoinHistoryData): CandlestickData => ({
        time: item.timestamp / 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      })
    );

    candlestickSeries.setData(candlestickData);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.resize(width, height);
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      chart.remove();
      chartRef.current = null;
      resizeObserver.disconnect();
    };
  }, [chartData]);

  if (data_source === "cmc") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-200">Price History</h3>
          <Tabs defaultValue={timeframe} onValueChange={handleTimeframeChange}>
            <TabsList className="bg-gray-900/60">
              <TabsTrigger
                value="1"
                className="data-[state=active]:bg-gray-800"
              >
                24h
              </TabsTrigger>
              <TabsTrigger
                value="7"
                className="data-[state=active]:bg-gray-800"
              >
                7d
              </TabsTrigger>
              <TabsTrigger
                value="30"
                className="data-[state=active]:bg-gray-800"
              >
                30d
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[400px] w-full min-w-[400px] relative rounded-lg border border-gray-800 bg-gray-900/50 p-4 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p>Historical data is not available in the free version of CMC</p>
            <p className="text-sm mt-2">
              Please upgrade to CMC Pro for historical data
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-200">Price History</h3>
        <Tabs defaultValue={timeframe} onValueChange={handleTimeframeChange}>
          <TabsList className="bg-gray-900/60">
            <TabsTrigger value="1" className="data-[state=active]:bg-gray-800">
              24h
            </TabsTrigger>
            <TabsTrigger value="7" className="data-[state=active]:bg-gray-800">
              7d
            </TabsTrigger>
            <TabsTrigger value="30" className="data-[state=active]:bg-gray-800">
              30d
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="h-[400px] w-full min-w-[400px] relative rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full w-full flex items-center justify-center text-red-500">
            {error.message}
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}

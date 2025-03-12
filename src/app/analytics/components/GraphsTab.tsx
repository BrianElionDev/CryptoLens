import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KnowledgeItem } from "@/types/knowledge";

interface GraphsTabProps {
  processedData: {
    projectDistribution: { name: string; value: number }[];
    projectTrends: Map<string, { date: string; rpoints: number }[]>;
    coinCategories: { coin: string; channel: string }[];
  };
  selectedChannels: string[];
  knowledge?: KnowledgeItem[];
  selectedProject?: string;
  setSelectedProject?: (project: string) => void;
}

export const GraphsTab = ({
  processedData,
  selectedChannels,
}: GraphsTabProps) => {
  const [selectedCoin, setSelectedCoin] = useState<string>("");
  const [timeframe, setTimeframe] = useState<"all" | "30" | "7">("all");

  // Reset selected coin when channels change
  useEffect(() => {
    setSelectedCoin("");
  }, [selectedChannels]);

  const top10Coins = useMemo(() => {
    const channelFilteredCoins =
      selectedChannels.length === 0
        ? processedData.projectDistribution
        : processedData.projectDistribution.filter((project) =>
            processedData.coinCategories.some(
              (coin) =>
                coin.coin === project.name &&
                selectedChannels.includes(coin.channel)
            )
          );

    const filtered = channelFilteredCoins.slice(0, 10);

    if (filtered.length > 0 && !selectedCoin) {
      setTimeout(() => setSelectedCoin(filtered[0].name), 0);
    }

    return filtered;
  }, [processedData, selectedChannels, selectedCoin]);

  const chartData = useMemo(() => {
    if (!selectedCoin) return [];

    const trendData =
      Array.from(processedData.projectTrends.entries()).find(
        ([coin]) => coin === selectedCoin
      )?.[1] || [];

    let filteredData = trendData;

    // Apply timeframe filter
    if (timeframe !== "all") {
      const daysAgo = parseInt(timeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      filteredData = trendData.filter((d) => new Date(d.date) >= cutoffDate);
    }

    // If no channels selected, show all data
    if (selectedChannels.length === 0) {
      return filteredData
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((d) => ({
          date: d.date,
          rpoints: Math.round(d.rpoints * 100) / 100,
        }));
    }

    // Get data only for selected channels
    const relevantChannels = processedData.coinCategories
      .filter(
        (entry) =>
          entry.coin === selectedCoin &&
          selectedChannels.includes(entry.channel)
      )
      .map((entry) => entry.channel);

    if (relevantChannels.length === 0) return [];

    return filteredData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: d.date,
        rpoints: Math.round(d.rpoints * 100) / 100,
      }));
  }, [
    processedData.projectTrends,
    processedData.coinCategories,
    selectedCoin,
    selectedChannels,
    timeframe,
  ]);

  return (
    <div className="space-y-8">
      <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-200">R-Points Trend</CardTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                <SelectTrigger className="w-[200px] bg-gray-900/50 border border-gray-700/50 text-gray-200 hover:bg-gray-800/50 transition-colors">
                  <SelectValue placeholder="Select a coin" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 border border-gray-700/50 text-gray-200 backdrop-blur-lg">
                  {top10Coins.map((coin, index) => (
                    <SelectItem
                      key={`${coin.name}-${index}`}
                      value={coin.name}
                      className="hover:bg-blue-500/20 focus:bg-blue-500/20 focus:text-blue-200"
                    >
                      {coin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs
                value={timeframe}
                onValueChange={(v) => setTimeframe(v as "all" | "30" | "7")}
              >
                <TabsList className="bg-gray-900/60">
                  <TabsTrigger value="7">7d</TabsTrigger>
                  <TabsTrigger value="30">30d</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRpoints" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="rgba(59, 130, 246, 0.5)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor="rgba(59, 130, 246, 0.1)"
                      stopOpacity={0.1}
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
                  stroke="#94a3b8"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "auto"]}
                  tickMargin={10}
                  tickFormatter={(value) => value.toLocaleString()}
                  width={80}
                  scale="linear"
                  padding={{ top: 20, bottom: 0 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload?.[0]?.value) {
                      return (
                        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-3 backdrop-blur-sm">
                          <p className="text-gray-200">
                            {new Date(label).toLocaleDateString()}
                          </p>
                          <p className="text-blue-400 font-medium">
                            {Number(payload[0].value).toLocaleString()} R-Points
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rpoints"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRpoints)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

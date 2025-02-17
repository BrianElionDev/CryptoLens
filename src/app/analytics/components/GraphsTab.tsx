import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

    // If no channels selected, show all data
    if (selectedChannels.length === 0) {
      return trendData
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((d) => ({
          date: new Date(d.date).toLocaleDateString(),
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

    return trendData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString(),
        rpoints: Math.round(d.rpoints * 100) / 100,
      }));
  }, [
    processedData.projectTrends,
    processedData.coinCategories,
    selectedCoin,
    selectedChannels,
  ]);

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-xl bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 border border-gray-800/20 backdrop-blur-sm">
        {/* Coin Selection */}
        <div className="mb-6 w-[200px]">
          <Select value={selectedCoin} onValueChange={setSelectedCoin}>
            <SelectTrigger>
              <SelectValue placeholder="Select a coin" />
            </SelectTrigger>
            <SelectContent>
              {top10Coins.map((coin, index) => (
                <SelectItem key={`${coin.name}-${index}`} value={coin.name}>
                  {coin.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="colorRpoints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d374850" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
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
                domain={["auto", "auto"]}
                tickMargin={10}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "0.5rem",
                  padding: "12px",
                }}
                labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                itemStyle={{ color: "#3b82f6" }}
                formatter={(value: number) => [
                  value.toLocaleString(),
                  "R-Points",
                ]}
              />
              <Area
                type="monotone"
                dataKey="rpoints"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRpoints)"
              />
              <Line
                type="monotone"
                dataKey="rpoints"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="R-Points"
                activeDot={{
                  r: 6,
                  fill: "#3b82f6",
                  stroke: "#1e3a8a",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

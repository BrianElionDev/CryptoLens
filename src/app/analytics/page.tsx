"use client";

import { motion } from "framer-motion";
import { useKnowledge } from "@/contexts/KnowledgeContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color: string;
    dataKey?: string;
    payload: {
      name: string;
      value: number;
      color: string;
    };
  }[];
  label?: string;
}

interface Project {
  Coin: string;
  Marketcap: string;
  Rpoints: number;
  "Total count": number;
}

interface SortedData {
  projects: Project[];
  total_count: number;
  total_rpoints: number;
}

const COLORS = ["#60A5FA", "#C084FC", "#F472B6", "#34D399", "#A78BFA"];

const formatLargeNumber = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
};

export default function AnalyticsPage() {
  const { knowledge, isLoading, error } = useKnowledge();

  // Process knowledge data for analytics
  const processedData = {
    marketCapDistribution: [] as { name: string; value: number }[],
    rPointsTrend: [] as { name: string; value: number }[],
    categoryDistribution: [] as { name: string; value: number }[],
    topProjects: [] as { name: string; rpoints: number }[],
  };

  if (knowledge && knowledge.length > 0) {
    // Calculate coin distribution
    const coinMap = new Map<string, number>();

    for (const item of knowledge) {
      if (!item.sorted) continue;

      try {
        const parsedData = JSON.parse(item.sorted);
        // The data is already the projects array
        const projects = parsedData;

        if (!Array.isArray(projects)) continue;

        for (const project of projects) {
          if (project && project.Coin && project["Total count"]) {
            const currentCount = coinMap.get(project.Coin) || 0;
            coinMap.set(project.Coin, currentCount + project["Total count"]);
          }
        }
      } catch (e) {
        console.error("Error parsing sorted data:", e);
      }
    }

    // console.log("Final coin map:", coinMap);

    // Convert to array and sort by frequency
    processedData.categoryDistribution = Array.from(coinMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Calculate market cap distribution
    const marketCapMap = new Map<string, number>();
    knowledge.forEach((item) => {
      if (item.sorted) {
        try {
          const data = JSON.parse(item.sorted) as SortedData;
          if (data && data.projects) {
            data.projects.forEach((project) => {
              // Convert market cap string to number (remove B, M, K suffixes)
              const capStr = project.Marketcap.replace(/[BMK]/g, "");
              let cap = parseFloat(capStr);
              if (!isNaN(cap)) {
                if (project.Marketcap.includes("B")) cap *= 1e9;
                else if (project.Marketcap.includes("M")) cap *= 1e6;
                else if (project.Marketcap.includes("K")) cap *= 1e3;
                marketCapMap.set(
                  project.Coin,
                  (marketCapMap.get(project.Coin) || 0) + cap
                );
              }
            });
          }
        } catch (e) {
          console.error("Error parsing sorted data:", e);
        }
      }
    });

    // Convert to array and sort by market cap
    processedData.marketCapDistribution = Array.from(marketCapMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // Calculate R-points trend
    const rPointsMap = new Map<string, number>();
    knowledge.forEach((item) => {
      if (item.sorted) {
        try {
          const data = JSON.parse(item.sorted) as SortedData;
          if (data && data.projects) {
            data.projects.forEach((project) => {
              const points = parseFloat(project.Rpoints.toString());
              if (!isNaN(points)) {
                rPointsMap.set(
                  String(project.Coin),
                  (rPointsMap.get(String(project.Coin)) || 0) + points
                );
              }
            });
          }
        } catch (e) {
          console.error("Error parsing sorted data:", e);
        }
      }
    });

    // Convert to array and sort by R-points
    processedData.rPointsTrend = Array.from(rPointsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }));

    // Get top projects by R-points
    processedData.topProjects = Array.from(rPointsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, rpoints]) => ({
        name,
        rpoints: Math.round(rpoints * 100) / 100,
      }));
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 backdrop-blur-sm border border-blue-500/20 p-4 rounded-lg shadow-xl">
          <p className="text-cyan-200 font-medium">{label}</p>
          {payload.map((entry, index) => {
            const value = entry.value;
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name}:{" "}
                {value >= 1e6
                  ? formatLargeNumber(value)
                  : value.toLocaleString()}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-cyan-200 text-center py-8">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/40 to-pink-600/40 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-gradient-to-r from-cyan-600/40 to-blue-600/40 rounded-full mix-blend-multiply filter blur-xl"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x mb-4">
            Crypto Analytics Dashboard
          </h1>
          <p className="text-gray-400 max-w-3xl">
            Real-time insights and analytics for cryptocurrency markets. Track
            trends, analyze performance, and make informed decisions.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Entries */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Total Entries
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {knowledge?.length || 0}
            </p>
          </div>
          {/* Total Coins */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Unique Coins
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {processedData.categoryDistribution.length}
            </p>
          </div>
          {/* Most Frequent Coin */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-pink-900/20 to-red-900/20 border border-pink-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Most Frequent Coin
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {processedData.categoryDistribution[0]?.name || "N/A"}
            </p>
          </div>
          {/* Top Frequency */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Top Frequency
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {processedData.categoryDistribution[0]?.value || 0}
            </p>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Coin Distribution */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-pink-900/20 via-red-900/20 to-orange-900/20 border border-pink-500/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-cyan-200 mb-4">
              Top 10 Coins Distribution
            </h2>
            <div className="h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={120}
                    outerRadius={200}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      `${name} (${value} - ${(percent * 100).toFixed(1)}%)`
                    }
                  >
                    {processedData.categoryDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{
                      paddingLeft: "20px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  );
}

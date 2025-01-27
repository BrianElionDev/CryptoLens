"use client";

import { useKnowledge } from "@/contexts/KnowledgeContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3B82F6", // blue-500
  "#8B5CF6", // purple-500
  "#EC4899", // pink-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#6366F1", // indigo-500
  "#14B8A6", // teal-500
  "#F43F5E", // rose-500
  "#8B5CF6", // violet-500
  "#06B6D4", // cyan-500
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-xl">
        <p className="text-cyan-200 font-medium">{payload[0].payload.name}</p>
        <p className="text-gray-300">
          Count: <span className="text-cyan-200">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { knowledge, isLoading, error } = useKnowledge();

  // Process knowledge data for analytics
  const processedData = {
    marketCapDistribution: [] as { name: string; value: number }[],
    rPointsTrend: [] as { name: string; value: number }[],
    projectDistribution: [] as { name: string; value: number }[],
    topProjects: [] as { name: string; rpoints: number }[],
  };

  if (knowledge && knowledge.length > 0) {
    // Calculate project distribution
    const projectMap = new Map<string, number>();
    const marketCapMap = new Map<string, number>();
    const rPointsMap = new Map<string, number>();

    knowledge.forEach((item) => {
      if (item.llm_answer && item.llm_answer.projects) {
        item.llm_answer.projects.forEach((project) => {
          // Project distribution
          projectMap.set(
            project.coin_or_project,
            (projectMap.get(project.coin_or_project) || 0) + 1
          );

          // Market cap distribution
          marketCapMap.set(
            project.marketcap,
            (marketCapMap.get(project.marketcap) || 0) + 1
          );

          // R-points distribution
          rPointsMap.set(
            project.coin_or_project,
            (rPointsMap.get(project.coin_or_project) || 0) + project.rpoints
          );
        });
      }
    });

    // Convert to arrays and sort
    processedData.projectDistribution = Array.from(projectMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    processedData.marketCapDistribution = Array.from(marketCapMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    processedData.rPointsTrend = Array.from(rPointsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }));

    processedData.topProjects = Array.from(rPointsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, rpoints]) => ({
        name,
        rpoints: Math.round(rpoints * 100) / 100,
      }));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
        <div className="text-cyan-200 text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
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
          {/* Total Projects */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Unique Projects
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {processedData.projectDistribution.length}
            </p>
          </div>
          {/* Most Frequent Project */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-pink-900/20 to-red-900/20 border border-pink-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Most Frequent Project
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {processedData.projectDistribution[0]?.name || "N/A"}
            </p>
          </div>
          {/* Top R Points */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              Highest R Points
            </h3>
            <p className="text-2xl font-bold text-cyan-200">
              {processedData.rPointsTrend[0]?.value || 0}
            </p>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Project Distribution */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-pink-900/20 via-red-900/20 to-orange-900/20 border border-pink-500/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-cyan-200 mb-4">
              Top 10 Projects Distribution
            </h2>
            <div className="h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.projectDistribution}
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
                    {processedData.projectDistribution.map((entry, index) => (
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

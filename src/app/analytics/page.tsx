"use client";

import { useKnowledge } from "@/contexts/KnowledgeContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useState, useMemo, useEffect } from "react";

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
  const [selectedProject, setSelectedProject] = useState("");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 640
  );

  // Process knowledge data for analytics
  const processedData = useMemo(() => {
    const data = {
      projectDistribution: [] as { name: string; value: number }[],
      projectTrends: new Map<string, { date: string; rpoints: number }[]>(),
    };

    if (!knowledge?.length) return data;

    // Calculate total R-points per project and collect trend data
    const projectRPoints = new Map<string, number>();
    const projectTrends = new Map<string, Map<string, number>>();

    knowledge.forEach((item) => {
      if (item.llm_answer?.projects) {
        item.llm_answer.projects.forEach((project) => {
          const projectName = project.coin_or_project;
          const rpoints = project.rpoints || 0;

          // Update total R-points
          projectRPoints.set(
            projectName,
            (projectRPoints.get(projectName) || 0) + rpoints
          );

          // Update trend data
          if (!projectTrends.has(projectName)) {
            projectTrends.set(projectName, new Map());
          }
          const trendMap = projectTrends.get(projectName)!;
          trendMap.set(item.date, (trendMap.get(item.date) || 0) + rpoints);
        });
      }
    });

    // Convert to sorted array for pie chart
    data.projectDistribution = Array.from(projectRPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }));

    // Convert trend data to array format
    projectTrends.forEach((dateMap, projectName) => {
      const trendData = Array.from(dateMap.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, rpoints]) => ({
          date,
          rpoints: Math.round(rpoints * 100) / 100,
        }));

      data.projectTrends.set(projectName, trendData);
    });

    return data;
  }, [knowledge]);

  // Set the default selected project when data is loaded
  useEffect(() => {
    if (processedData.projectDistribution.length > 0 && !selectedProject) {
      setSelectedProject(processedData.projectDistribution[0].name);
    }
  }, [processedData.projectDistribution, selectedProject]);

  // Get trend data for selected project
  const projectTrendData = useMemo(() => {
    if (!selectedProject) return [];
    return processedData.projectTrends.get(selectedProject) || [];
  }, [selectedProject, processedData.projectTrends]);

  // Add this useEffect for handling window resize
  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x mb-2 sm:mb-4">
            Crypto Analytics Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-3xl">
            Real-time insights and analytics for cryptocurrency markets. Track
            trends, analyze performance, and make informed decisions.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {/* Total Entries */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
              Total Entries
            </h3>
            <p className="text-lg sm:text-2xl font-bold text-cyan-200">
              {knowledge?.length || 0}
            </p>
          </div>
          {/* Total Projects */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
              Unique Coins
            </h3>
            <p className="text-lg sm:text-2xl font-bold text-cyan-200">
              {processedData.projectDistribution.length}
            </p>
          </div>
          {/* Most Frequent Project */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-pink-900/20 to-red-900/20 border border-pink-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
              Most Frequent Coin
            </h3>
            <p className="text-lg sm:text-2xl font-bold text-cyan-200">
              {processedData.projectDistribution[0]?.name || "N/A"}
            </p>
          </div>
          {/* Top R Points */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 backdrop-blur-sm">
            <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
              Highest R Points
            </h3>
            <p className="text-lg sm:text-2xl font-bold text-cyan-200">
              {processedData.projectDistribution[0]?.value || 0}
            </p>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {/* Project Distribution */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-pink-900/20 via-red-900/20 to-orange-900/20 border border-pink-500/20 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-bold text-cyan-200 mb-4">
              Top 10 Coins by Total R-Points
            </h2>
            <div className="h-[400px] sm:h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.projectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={windowWidth < 640 ? 60 : 120}
                    outerRadius={windowWidth < 640 ? 100 : 200}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      windowWidth < 640
                        ? `${name.slice(0, 8)}...${(percent * 100).toFixed(1)}%`
                        : `${name} (${value} total rpoints - ${(
                            percent * 100
                          ).toFixed(1)}%)`
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
                    layout={windowWidth < 640 ? "horizontal" : "vertical"}
                    align={windowWidth < 640 ? "center" : "right"}
                    verticalAlign={windowWidth < 640 ? "bottom" : "middle"}
                    wrapperStyle={{
                      paddingLeft: windowWidth < 640 ? "0" : "20px",
                      fontSize: windowWidth < 640 ? "12px" : "14px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Graph */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-cyan-200">
                Project R-Points Over Time
              </h2>
              <select
                className="w-full sm:w-auto bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                onChange={(e) => setSelectedProject(e.target.value)}
                value={selectedProject}
              >
                <option value="">Select a project</option>
                {processedData.projectDistribution.map((project) => (
                  <option key={project.name} value={project.name}>
                    {project.name} ({project.value} total rpoints)
                  </option>
                ))}
              </select>
            </div>
            <div className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projectTrendData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: windowWidth < 640 ? 0 : 20,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="colorRpoints"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: windowWidth < 640 ? 10 : 12,
                    }}
                    tickFormatter={(date) =>
                      windowWidth < 640
                        ? new Date(date).toLocaleDateString(undefined, {
                            month: "numeric",
                            day: "numeric",
                          })
                        : new Date(date).toLocaleDateString()
                    }
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: windowWidth < 640 ? 10 : 12,
                    }}
                    tickLine={false}
                    axisLine={false}
                    label={
                      windowWidth < 640
                        ? undefined
                        : {
                            value: "R-Points",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9CA3AF",
                            style: { textAnchor: "middle" },
                          }
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 shadow-xl">
                            <p className="text-cyan-200 font-medium mb-1">
                              {new Date(label).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                              <p className="text-gray-300">
                                R-Points:{" "}
                                <span className="text-cyan-200 font-medium">
                                  {payload[0].value}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rpoints"
                    stroke="url(#colorLine)"
                    strokeWidth={3}
                    fill="url(#colorRpoints)"
                    dot={{
                      fill: "#3B82F6",
                      stroke: "#1E40AF",
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                      fill: "#60A5FA",
                      stroke: "#3B82F6",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
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

"use client";

import { useKnowledge } from "@/contexts/KnowledgeContext";

import { useState, useMemo, useEffect } from "react";
import { GraphsTab } from "./components/GraphsTab";
import { CategoriesTab } from "./components/CategoriesTab";
import { CoinCategoriesTab } from "./components/CoinCategoriesTab";

// Add type for tab
type TabType = "graphs" | "categories" | "coinCategories";

// Add interface for raw project data
interface RawProjectData {
  coin_or_project: string;
  Rpoints?: number;
  rpoints?: number;
  category?: string[];
}

export default function AnalyticsPage() {
  const { knowledge, isLoading, error } = useKnowledge();
  const [selectedProject, setSelectedProject] = useState("");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 640
  );
  const [activeTab, setActiveTab] = useState<TabType>("graphs");

  // Process knowledge data for analytics
  const processedData = useMemo(() => {
    const data = {
      projectDistribution: [] as { name: string; value: number }[],
      projectTrends: new Map<string, { date: string; rpoints: number }[]>(),
      categoryDistribution: [] as { name: string; value: number }[],
      coinCategories: [] as { coin: string; categories: string[] }[],
    };

    if (!knowledge?.length) return data;

    // Create a Map to track unique coins and their categories
    const coinCategoryMap = new Map<string, Set<string>>();

    knowledge.forEach((item) => {
      if (item.llm_answer?.projects) {
        const date = new Date(item.date).toISOString().split("T")[0];

        // Handle both array and object formats of llm_answer
        const projects = Array.isArray(item.llm_answer.projects)
          ? item.llm_answer.projects
          : [item.llm_answer.projects];

        projects.forEach((project: RawProjectData) => {
          const projectName = project.coin_or_project;
          const rpoints = project.Rpoints || project.rpoints || 0;

          // Update project trends
          if (!data.projectTrends.has(projectName)) {
            data.projectTrends.set(projectName, []);
          }
          const trendData = data.projectTrends.get(projectName)!;

          // Find or create entry for this date
          let dateEntry = trendData.find((entry) => entry.date === date);
          if (!dateEntry) {
            dateEntry = { date, rpoints: 0 };
            trendData.push(dateEntry);
          }
          dateEntry.rpoints += rpoints;

          // Update total R-points for distribution
          const currentTotal = data.projectDistribution.find(
            (p) => p.name === projectName
          );
          if (currentTotal) {
            currentTotal.value += rpoints;
          } else {
            data.projectDistribution.push({
              name: projectName,
              value: rpoints,
            });
          }

          // Update category distribution
          if (project.category) {
            project.category.forEach((cat) => {
              const categoryEntry = data.categoryDistribution.find(
                (c) => c.name === cat
              );
              if (categoryEntry) {
                categoryEntry.value++;
              } else {
                data.categoryDistribution.push({ name: cat, value: 1 });
              }
            });
          }

          // Track unique categories for each coin
          if (project.category) {
            if (!coinCategoryMap.has(projectName)) {
              coinCategoryMap.set(projectName, new Set());
            }
            project.category.forEach((cat) => {
              coinCategoryMap.get(projectName)!.add(cat);
            });
          }
        });
      }
    });

    // Convert coin categories map to array
    data.coinCategories = Array.from(coinCategoryMap.entries()).map(
      ([coin, categories]) => ({
        coin,
        categories: Array.from(categories),
      })
    );

    // Sort by coin name
    data.coinCategories.sort((a, b) => a.coin.localeCompare(b.coin));

    // Sort distributions
    data.projectDistribution.sort((a, b) => b.value - a.value);
    data.categoryDistribution.sort((a, b) => b.value - a.value);

    // Ensure all dates for all projects
    const allDates = new Set<string>();
    data.projectTrends.forEach((trendData) => {
      trendData.forEach((entry) => allDates.add(entry.date));
    });

    data.projectTrends.forEach((trendData) => {
      const existingDates = new Set(trendData.map((entry) => entry.date));
      allDates.forEach((date) => {
        if (!existingDates.has(date)) {
          trendData.push({ date, rpoints: 0 });
        }
      });
      trendData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
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
    if (!selectedProject || !processedData.projectTrends.has(selectedProject)) {
      return [];
    }
    return processedData.projectTrends.get(selectedProject)!;
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

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("graphs")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "graphs"
                ? "text-cyan-200"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Charts & Graphs
            {activeTab === "graphs" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "categories"
                ? "text-cyan-200"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Categories
            {activeTab === "categories" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("coinCategories")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "coinCategories"
                ? "text-cyan-200"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Coin Categories
            {activeTab === "coinCategories" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "graphs" ? (
          <GraphsTab
            processedData={processedData}
            knowledge={knowledge}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            windowWidth={windowWidth}
            projectTrendData={projectTrendData}
          />
        ) : activeTab === "categories" ? (
          <CategoriesTab
            categoryDistribution={processedData.categoryDistribution}
          />
        ) : (
          <CoinCategoriesTab processedData={processedData} />
        )}
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

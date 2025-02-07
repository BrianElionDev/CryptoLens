"use client";

import { useKnowledge } from "@/contexts/KnowledgeContext";
import { useState, useMemo, useEffect } from "react";
import { GraphsTab } from "./components/GraphsTab";
import { CategoriesTab } from "./components/CategoriesTab";
import { CombinedMarketTable } from "./components/CombinedMarketTable";

// Add type for tab
type TabType = "market" | "graphs" | "categories";

// Add interface for raw project data
interface RawProjectData {
  coin_or_project: string;
  Rpoints?: number;
  rpoints?: number;
  category?: string[];
}

export default function AnalyticsPage() {
  const { knowledge } = useKnowledge();
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [tempSelectedChannels, setTempSelectedChannels] = useState<string[]>(
    []
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const processedData = useMemo(() => {
    const data = {
      projectDistribution: [] as { name: string; value: number }[],
      projectTrends: new Map<string, { date: string; rpoints: number }[]>(),
      categoryDistribution: [] as { name: string; value: number }[],
      coinCategories: [] as {
        coin: string;
        categories: string[];
        channel: string;
      }[],
      channels: [] as string[],
    };

    if (!knowledge?.length) {
      console.log("No knowledge data available");
      return data;
    }

    console.log(`Processing ${knowledge.length} knowledge entries`);

    // Create a Map to track unique coins and their categories
    const coinCategoryMap = new Map<string, Set<string>>();
    const projectMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const channelSet = new Set<string>();

    let totalProjects = 0;

    knowledge.forEach((item) => {
      const projects = item.llm_answer.projects;
      const channel = item["channel name"];
      channelSet.add(channel);
      totalProjects += projects.length;

      projects.forEach((project: RawProjectData) => {
        const projectName = project.coin_or_project;
        const rpoints = Number(project.rpoints || project.Rpoints || 0);

        // Update project distribution
        const currentPoints = projectMap.get(projectName) || 0;
        projectMap.set(projectName, currentPoints + rpoints);

        // Track unique categories for each coin
        if (project.category) {
          if (!coinCategoryMap.has(projectName)) {
            coinCategoryMap.set(projectName, new Set());
          }
          project.category.forEach((cat) => {
            coinCategoryMap.get(projectName)!.add(cat);
            const currentCount = categoryMap.get(cat) || 0;
            categoryMap.set(cat, currentCount + 1);
          });
        }
      });
    });

    // Convert Maps to arrays
    data.projectDistribution = Array.from(projectMap.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    data.categoryDistribution = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    // Convert coin categories map to array
    data.coinCategories = Array.from(coinCategoryMap.entries())
      .map(([coin, categories]) => ({
        coin,
        categories: Array.from(categories),
        channel:
          knowledge.find((item) =>
            item.llm_answer.projects.some((p) => p.coin_or_project === coin)
          )?.["channel name"] || "",
      }))
      .sort((a, b) => a.coin.localeCompare(b.coin));

    // Add channels
    data.channels = Array.from(channelSet).sort();

    console.log(
      `Processed ${totalProjects} total projects into ${data.coinCategories.length} unique coins`
    );

    return data;
  }, [knowledge]);

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
      <div className="container mx-auto px-4 space-y-8">
        {/* Channel Selector */}
        <div className="flex justify-end mb-4">
          <div className="relative">
            <button
              onClick={() => {
                setShowChannelMenu(!showChannelMenu);
                setTempSelectedChannels(selectedChannels);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900/60 border border-gray-700/50 text-gray-200 hover:bg-gray-800/60 flex items-center gap-2"
            >
              <span>Channels</span>
              <span className="text-blue-400">
                {selectedChannels.length ? `(${selectedChannels.length})` : ""}
              </span>
            </button>
            {showChannelMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-lg backdrop-blur-sm z-10 p-4">
                <div className="flex justify-between mb-4">
                  <button
                    onClick={() =>
                      setTempSelectedChannels(processedData.channels)
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setTempSelectedChannels([])}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {processedData.channels.map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center px-4 py-2 hover:bg-gray-800/60 cursor-pointer rounded"
                    >
                      <input
                        type="checkbox"
                        checked={tempSelectedChannels.includes(channel)}
                        onChange={(e) => {
                          setTempSelectedChannels((prev) =>
                            e.target.checked
                              ? [...prev, channel]
                              : prev.filter((ch) => ch !== channel)
                          );
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-200">{channel}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowChannelMenu(false)}
                    className="px-3 py-1 text-gray-400 hover:text-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedChannels(tempSelectedChannels);
                      setShowChannelMenu(false);
                    }}
                    className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg bg-gray-900/50 p-1 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab("market")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "market"
                  ? "bg-blue-500/20 text-blue-300"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setActiveTab("graphs")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "graphs"
                  ? "bg-blue-500/20 text-blue-300"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Graphs
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "categories"
                  ? "bg-blue-500/20 text-blue-300"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Categories
            </button>
          </div>
        </div>

        {activeTab === "market" && (
          <CombinedMarketTable
            processedData={processedData}
            selectedChannels={selectedChannels}
          />
        )}
        {activeTab === "graphs" && (
          <GraphsTab
            processedData={processedData}
            knowledge={knowledge}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            windowWidth={windowWidth}
            projectTrendData={
              processedData.projectTrends.get(selectedProject) || []
            }
          />
        )}

        {activeTab === "categories" && (
          <CategoriesTab
            categoryDistribution={processedData.categoryDistribution}
          />
        )}
      </div>
    </div>
  );
}

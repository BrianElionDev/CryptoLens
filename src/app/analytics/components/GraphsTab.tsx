import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { KnowledgeItem } from "@/types/knowledge";

interface GraphsTabProps {
  processedData: {
    projectDistribution: { name: string; value: number }[];
    projectTrends: Map<string, { date: string; rpoints: number }[]>;
  };
  knowledge: KnowledgeItem[];
  selectedProject: string;
  setSelectedProject: (project: string) => void;
  windowWidth: number;
  projectTrendData: { date: string; rpoints: number }[];
}

export const GraphsTab = ({ processedData, knowledge }: GraphsTabProps) => {
  const [selectedProjectState, setSelectedProjectState] = useState("");

  // Set initial selected project
  useEffect(() => {
    if (processedData.projectDistribution.length > 0 && !selectedProjectState) {
      setSelectedProjectState(processedData.projectDistribution[0].name);
    }
  }, [processedData.projectDistribution, selectedProjectState]);

  // Get trend data for selected project
  const projectTrendDataState = useMemo(() => {
    if (!selectedProjectState || !knowledge) return [];

    // Create a map of dates to rpoints for the selected project
    const trendMap = new Map<string, number>();

    knowledge.forEach((entry) => {
      const date = new Date(entry.date).toLocaleDateString();
      entry.llm_answer.projects.forEach((project) => {
        if (project.coin_or_project === selectedProjectState) {
          const rpoints = Number(project.rpoints || 0);
          trendMap.set(date, (trendMap.get(date) || 0) + rpoints);
        }
      });
    });

    // Convert map to array and sort by date
    return Array.from(trendMap.entries())
      .map(([date, rpoints]) => ({ date, rpoints }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedProjectState, knowledge]);

  const top10Projects = processedData.projectDistribution.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Project Selection */}
      <div className="bg-gray-900/50 rounded-xl p-6 backdrop-blur-sm border border-gray-800/50">
        <h3 className="text-lg font-semibold text-cyan-200 mb-4">
          Top 10 Projects by R-Points
        </h3>
        <select
          value={selectedProjectState}
          onChange={(e) => setSelectedProjectState(e.target.value)}
          className="w-full bg-gray-800/50 text-gray-200 border border-gray-700/50 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {top10Projects.map((project) => (
            <option key={project.name} value={project.name}>
              {project.name} ({project.value} R-Points)
            </option>
          ))}
        </select>
      </div>

      {/* Trend Chart */}
      <div className="bg-gray-900/50 rounded-xl p-6 backdrop-blur-sm border border-gray-800/50">
        <h3 className="text-lg font-semibold text-cyan-200 mb-4">
          R-Points Trend for {selectedProjectState}
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectTrendDataState}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: "#9ca3af" }}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.8)",
                  border: "1px solid rgba(59, 130, 246, 0.5)",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(8px)",
                }}
                labelStyle={{ color: "#e5e7eb" }}
                itemStyle={{ color: "#93c5fd" }}
              />
              <Line
                type="monotone"
                dataKey="rpoints"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6, fill: "#60a5fa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

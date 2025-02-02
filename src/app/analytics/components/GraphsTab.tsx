import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  AreaChart,
  Area,
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

export const GraphsTab = ({
  processedData,
  selectedProject,
  setSelectedProject,
  windowWidth,
  projectTrendData,
}: GraphsTabProps) => {
  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
        {/* Total Entries */}

        {/* Other stats cards... */}
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8">
        {/* Pie Chart */}
        <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-indigo-300">
              Top 10 Coins by R-Points
            </h3>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processedData.projectDistribution.slice(0, 10)}
                  cx="50%"
                  cy="50%"
                  innerRadius={windowWidth < 640 ? 60 : 100}
                  outerRadius={windowWidth < 640 ? 100 : 160}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) =>
                    windowWidth < 640
                      ? `${name.slice(0, 8)}...${(percent * 100).toFixed(1)}%`
                      : `${name} (${value.toLocaleString()})`
                  }
                  labelLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                >
                  {processedData.projectDistribution
                    .slice(0, 10)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${(index * 25 + 220) % 360}, 70%, 60%)`}
                      />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid rgba(107, 114, 128, 0.3)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "R-Points",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value.length > 20 ? `${value.slice(0, 20)}...` : value
                  }
                  wrapperStyle={{
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart */}
        <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-indigo-300">
              R-Points Timeline
            </h3>
            <select
              className="w-full sm:w-auto bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
              onChange={(e) => setSelectedProject(e.target.value)}
              value={selectedProject}
            >
              <option value="">Select a project</option>
              {processedData.projectDistribution.slice(0, 10).map((project) => (
                <option key={project.name} value={project.name}>
                  {project.name} ({project.value} total rpoints)
                </option>
              ))}
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={projectTrendData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorRPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  cursor={{ stroke: "#6b7280", strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid rgba(107, 114, 128, 0.3)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "R-Points",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="rpoints"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRPoints)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

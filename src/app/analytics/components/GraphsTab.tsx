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
import { KnowledgeItem } from "@/types/knowledge";

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
  knowledge,
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
        <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 backdrop-blur-sm">
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
            Total Entries
          </h3>
          <p className="text-lg sm:text-2xl font-bold text-cyan-200">
            {knowledge?.length || 0}
          </p>
        </div>
        {/* Other stats cards... */}
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8">
        {/* Pie Chart */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-pink-900/20 via-red-900/20 to-orange-900/20 border border-pink-500/20 backdrop-blur-sm">
          <h2 className="text-lg sm:text-xl font-bold text-cyan-200 mb-4">
            Top 10 Coins by Total R-Points
          </h2>
          <div className="h-[400px] sm:h-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processedData.projectDistribution.slice(0, 10)}
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
                  {processedData.projectDistribution
                    .slice(0, 10)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-cyan-200">
              Coin R-Points Over Time
            </h2>
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
                  <linearGradient id="colorRpoints" x1="0" y1="0" x2="0" y2="1">
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
                    new Date(date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{
                    fill: "#9CA3AF",
                    fontSize: windowWidth < 640 ? 10 : 12,
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 shadow-xl">
                          <p className="text-cyan-200 font-medium mb-1">
                            {new Date(label).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
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
                  strokeWidth={2}
                  fill="url(#colorRpoints)"
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

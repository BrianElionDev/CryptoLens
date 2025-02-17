import { useState, useMemo } from "react";
import { formatNumber } from "@/lib/utils";

interface CategoryMarketTableProps {
  selectedChannels: string[];
  processedData: {
    coinCategories: {
      coin: string;
      categories: string[];
      channel: string;
      rpoints: number;
    }[];
  };
}

export const CategoryMarketTable = ({
  selectedChannels,
  processedData,
}: CategoryMarketTableProps) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  // Get categories directly from processedData
  const categoryData = useMemo(() => {
    const categories = new Map<
      string,
      { total_rpoints: number; coins: Set<string> }
    >();

    processedData.coinCategories
      .filter(
        (coin) =>
          selectedChannels.length === 0 ||
          selectedChannels.includes(coin.channel)
      )
      .forEach((coin) => {
        coin.categories.forEach((category) => {
          if (!categories.has(category)) {
            categories.set(category, { total_rpoints: 0, coins: new Set() });
          }
          const categoryData = categories.get(category)!;
          categoryData.total_rpoints += coin.rpoints;
          categoryData.coins.add(coin.coin);
        });
      });

    return Array.from(categories.entries()).map(([name, data]) => ({
      id: name,
      name,
      total_rpoints: data.total_rpoints,
      top_3_coins: Array.from(data.coins).slice(0, 3),
    }));
  }, [processedData.coinCategories, selectedChannels]);

  const filteredAndSortedData = useMemo(
    () =>
      categoryData
        .filter((category) =>
          category.name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) =>
          sortOrder === "asc"
            ? a.total_rpoints - b.total_rpoints
            : b.total_rpoints - a.total_rpoints
        ),
    [categoryData, search, sortOrder]
  );

  if (!categoryData.length) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm p-8">
          <div className="text-center text-gray-400">
            No category data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-cyan-200">
              Category Overview
            </h2>
            <input
              type="text"
              placeholder="Search categories..."
              className="w-64 bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                  #
                </th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                  Category
                </th>
                <th
                  className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                  onClick={() => {
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  }}
                >
                  Total R-Points
                </th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                  Top Coins
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredAndSortedData.map((category, index) => (
                <tr
                  key={category.id}
                  className="hover:bg-blue-500/10 transition-colors"
                >
                  <td className="py-4 px-6 whitespace-nowrap text-gray-400">
                    {index + 1}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-200 font-medium">
                        {category.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{
                            width: `${
                              (category.total_rpoints /
                                Math.max(
                                  ...categoryData.map((c) => c.total_rpoints)
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-cyan-200 font-bold whitespace-nowrap">
                        {formatNumber(category.total_rpoints, "default")}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      {category.top_3_coins.map((coin) => (
                        <span
                          key={coin}
                          className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300"
                        >
                          {coin}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

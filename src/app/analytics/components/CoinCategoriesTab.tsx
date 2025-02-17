import { useState, useMemo } from "react";

interface CoinCategoriesTabProps {
  processedData: {
    projectDistribution: { name: string; value: number }[];
    coinCategories: { coin: string; categories: string[] }[];
  };
}

export const CoinCategoriesTab = ({
  processedData,
}: CoinCategoriesTabProps) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "categories" | "rpoints">(
    "rpoints"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSortedData = useMemo(() => {
    return processedData.coinCategories
      .filter(
        (coin) =>
          coin.coin.toLowerCase().includes(search.toLowerCase()) ||
          coin.categories.some((cat) =>
            cat.toLowerCase().includes(search.toLowerCase())
          )
      )
      .sort((a, b) => {
        const aPoints =
          processedData.projectDistribution.find((p) => p.name === a.coin)
            ?.value || 0;
        const bPoints =
          processedData.projectDistribution.find((p) => p.name === b.coin)
            ?.value || 0;

        switch (sortBy) {
          case "name":
            return sortOrder === "asc"
              ? a.coin.localeCompare(b.coin)
              : b.coin.localeCompare(a.coin);
          case "categories":
            return sortOrder === "asc"
              ? a.categories.length - b.categories.length
              : b.categories.length - a.categories.length;
          case "rpoints":
            return sortOrder === "asc" ? aPoints - bPoints : bPoints - aPoints;
          default:
            return 0;
        }
      });
  }, [processedData, search, sortBy, sortOrder]);

  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-cyan-200">
            Coin Categories Overview
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search coins or categories..."
              className="w-full sm:w-64 bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 text-sm text-gray-200"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split("-") as [
                  "name" | "categories" | "rpoints",
                  "asc" | "desc"
                ];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
            >
              <option value="rpoints-desc">R-Points (High to Low)</option>
              <option value="rpoints-asc">R-Points (Low to High)</option>
              <option value="name-asc">Name (A to Z)</option>
              <option value="name-desc">Name (Z to A)</option>
              <option value="categories-desc">
                Categories (Most to Least)
              </option>
              <option value="categories-asc">Categories (Least to Most)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                Coin
              </th>
              <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                Categories
              </th>
              <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                R-Points
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredAndSortedData.map((coin, index) => (
              <tr
                key={`${coin.coin}-${index}`}
                className="hover:bg-blue-500/10 transition-colors"
              >
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-200 font-medium">
                      {coin.coin}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-2">
                    {coin.categories.map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-cyan-200 font-bold">
                    {processedData.projectDistribution.find(
                      (p) => p.name === coin.coin
                    )?.value || 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

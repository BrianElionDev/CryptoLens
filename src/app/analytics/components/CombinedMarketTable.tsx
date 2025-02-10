import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { formatNumber } from "@/lib/utils";
import Image from "next/image";
import { CategoryMarketTable } from "./CategoryMarketTable";

interface CombinedMarketTableProps {
  processedData: {
    projectDistribution: { name: string; value: number }[];
    coinCategories: {
      coin: string;
      categories: string[];
      channel: string;
      rpoints: number;
    }[];
    channels: string[];
  };
  selectedChannels: string[];
}

interface CoinMarketData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  percent_change_24h: number;
  circulating_supply: number;
  image?: string;
}

type TableTab = "all" | "nfts" | "categories";
type Column =
  | "price"
  | "24h"
  | "market_cap"
  | "volume"
  | "rpoints"
  | "categories"
  | "supply";

export const CombinedMarketTable = ({
  processedData,
  selectedChannels,
}: CombinedMarketTableProps) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TableTab>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<Column>("rpoints");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [marketData, setMarketData] = useState<Record<string, CoinMarketData>>(
    {}
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<Column[]>([
    "price",
    "24h",
    "market_cap",
    "volume",
    "rpoints",
    "categories",
  ]);
  const [visibleColumns, setVisibleColumns] = useState<Column[]>([
    "price",
    "24h",
    "market_cap",
    "volume",
    "rpoints",
    "categories",
  ]);

  // Store coin list in ref to prevent unnecessary fetches
  const coinListRef = useRef<string[]>([]);

  // Update coin list when processedData changes
  useEffect(() => {
    if (!processedData.coinCategories.length) {
      return;
    }

    const uniqueCoins = Array.from(
      new Set(processedData.coinCategories.map((coin) => coin.coin))
    );
    coinListRef.current = uniqueCoins;
  }, [processedData.coinCategories]);

  // Separate effect for market data fetching
  useEffect(() => {
    let mounted = true;
    const fetchMarketData = async () => {
      try {
        if (coinListRef.current.length === 0) return;

        const response = await axios.post("/api/coingecko", {
          symbols: coinListRef.current,
          forceRefresh: true,
          t: Date.now(),
        });

        if (!mounted) return;

        if (response.data?.data) {
          const newData = response.data.data as Record<string, CoinMarketData>;
          const updatedData = JSON.parse(JSON.stringify(newData));

          setMarketData((prevData) => {
            const hasChanges = Object.entries(updatedData).some((entry) => {
              const [coin, data] = entry as [string, CoinMarketData];
              const current = prevData[coin];
              return (
                !current ||
                current.price !== data.price ||
                current.percent_change_24h !== data.percent_change_24h
              );
            });

            return hasChanges ? updatedData : prevData;
          });
        }
      } catch {
        // Failed to fetch market data
      }
    };

    fetchMarketData();

    const interval = setInterval(() => {
      fetchMarketData();
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
      setMarketData({});
    };
  }, []);

  // Top categories (most frequent)
  const topCategories = useMemo(() => {
    const categoryCount = new Map<string, number>();
    processedData.coinCategories.forEach((coin) => {
      coin.categories.forEach((cat) => {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      });
    });
    return Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat);
  }, [processedData.coinCategories]);

  const handleSelectAllColumns = () => {
    setTempVisibleColumns([
      "price",
      "24h",
      "market_cap",
      "volume",
      "rpoints",
      "categories",
      "supply",
    ]);
  };

  const handleDeselectAllColumns = () => {
    setTempVisibleColumns([]);
  };

  const handleSaveColumns = () => {
    setVisibleColumns(tempVisibleColumns);
    setShowColumnMenu(false);
  };

  const toggleColumn = (column: Column) => {
    setTempVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column]
    );
  };

  // Memoize the combined data calculation
  const combinedData = useMemo(() => {
    return processedData.coinCategories
      .filter((coin) => {
        if (selectedChannels.length > 0) {
          return selectedChannels.some((channel) => coin.channel === channel);
        }
        return true;
      })
      .map((coin) => {
        const rpoints =
          processedData.projectDistribution.find((p) => p.name === coin.coin)
            ?.value || 0;

        const marketInfo = marketData[coin.coin];

        return {
          ...coin,
          rpoints,
          marketData: marketInfo
            ? { ...marketInfo }
            : {
                id: coin.coin,
                name: coin.coin,
                symbol: coin.coin,
                price: 0,
                market_cap: 0,
                volume_24h: 0,
                percent_change_24h: 0,
                circulating_supply: 0,
              },
        };
      })
      .filter((coin) => {
        // Filter by search
        const matchesSearch =
          coin.coin.toLowerCase().includes(search.toLowerCase()) ||
          (activeTab !== "all" && // Only search categories if not in "all" tab
            coin.categories.some((cat) =>
              cat.toLowerCase().includes(search.toLowerCase())
            ));

        // Filter by tab and category
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "nfts" &&
            coin.categories.some((cat) => cat.toLowerCase().includes("nft"))) ||
          (activeTab === "categories" && selectedCategory
            ? coin.categories.includes(selectedCategory)
            : true);

        return matchesSearch && matchesTab;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price":
            return sortOrder === "asc"
              ? (a.marketData?.price || 0) - (b.marketData?.price || 0)
              : (b.marketData?.price || 0) - (a.marketData?.price || 0);
          case "24h":
            return sortOrder === "asc"
              ? (a.marketData?.percent_change_24h || 0) -
                  (b.marketData?.percent_change_24h || 0)
              : (b.marketData?.percent_change_24h || 0) -
                  (a.marketData?.percent_change_24h || 0);
          case "market_cap":
            return sortOrder === "asc"
              ? (a.marketData?.market_cap || 0) -
                  (b.marketData?.market_cap || 0)
              : (b.marketData?.market_cap || 0) -
                  (a.marketData?.market_cap || 0);
          case "volume":
            return sortOrder === "asc"
              ? (a.marketData?.volume_24h || 0) -
                  (b.marketData?.volume_24h || 0)
              : (b.marketData?.volume_24h || 0) -
                  (a.marketData?.volume_24h || 0);
          case "supply":
            return sortOrder === "asc"
              ? (a.marketData?.circulating_supply || 0) -
                  (b.marketData?.circulating_supply || 0)
              : (b.marketData?.circulating_supply || 0) -
                  (a.marketData?.circulating_supply || 0);
          case "rpoints":
          default:
            return sortOrder === "asc"
              ? a.rpoints - b.rpoints
              : b.rpoints - a.rpoints;
        }
      });
  }, [
    processedData,
    marketData,
    search,
    sortBy,
    sortOrder,
    activeTab,
    selectedCategory,
    selectedChannels,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => {
              setActiveTab("all");
              setSelectedCategory(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "all"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            All Crypto
          </button>
          <button
            onClick={() => {
              setActiveTab("nfts");
              setSelectedCategory(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "nfts"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            NFTs
          </button>
          <button
            onClick={() => {
              setActiveTab("categories");
              setSelectedCategory(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Categories
          </button>

          {activeTab !== "categories" &&
            topCategories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveTab("categories");
                  setSelectedCategory(category);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {category}
              </button>
            ))}

          <style jsx global>{`
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      </div>

      {/* Table Controls */}
      {activeTab !== "categories" && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search coins or categories..."
              className="w-full sm:w-64 bg-gray-900/60 border border-gray-700/50 rounded-lg py-2 px-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => {
                  setShowColumnMenu(!showColumnMenu);
                  setTempVisibleColumns(visibleColumns);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-900/60 border border-gray-700/50 text-gray-200 hover:bg-gray-800/60"
              >
                Columns
              </button>
              {showColumnMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-lg backdrop-blur-sm z-10 p-4">
                  <div className="flex justify-between mb-4">
                    <button
                      onClick={handleSelectAllColumns}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllColumns}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="space-y-2 mb-4">
                    {[
                      { id: "price", label: "Price" },
                      { id: "24h", label: "24h %" },
                      { id: "market_cap", label: "Market Cap" },
                      { id: "volume", label: "Volume" },
                      { id: "supply", label: "Circulating Supply" },
                      { id: "rpoints", label: "R-Points" },
                      { id: "categories", label: "Categories" },
                    ].map(({ id, label }) => (
                      <label
                        key={id}
                        className="flex items-center px-4 py-2 hover:bg-gray-800/60 cursor-pointer rounded"
                      >
                        <input
                          type="checkbox"
                          checked={tempVisibleColumns.includes(id as Column)}
                          onChange={() => toggleColumn(id as Column)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-200">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveColumns}
                      className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 text-sm"
                    >
                      Apply Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tables */}
      {activeTab === "categories" ? (
        <CategoryMarketTable
          selectedChannels={selectedChannels}
          processedData={processedData}
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
          <div className="overflow-x-auto min-w-full">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-800">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="sticky left-0 z-10 bg-gray-900/40 py-4 px-4 lg:px-6 text-left text-sm font-medium text-gray-400">
                      #
                    </th>
                    <th className="sticky left-[60px] lg:left-[76px] z-10 bg-gray-900/40 py-4 px-4 lg:px-6 text-left text-sm font-medium text-gray-400">
                      Coin
                    </th>
                    {visibleColumns.includes("price") && (
                      <th
                        className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                        onClick={() => {
                          setSortBy("price");
                          setSortOrder(
                            sortBy === "price" && sortOrder === "desc"
                              ? "asc"
                              : "desc"
                          );
                        }}
                      >
                        Price
                      </th>
                    )}
                    {visibleColumns.includes("24h") && (
                      <th
                        className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                        onClick={() => {
                          setSortBy("24h");
                          setSortOrder(
                            sortBy === "24h" && sortOrder === "desc"
                              ? "asc"
                              : "desc"
                          );
                        }}
                      >
                        24h %
                      </th>
                    )}
                    {visibleColumns.includes("market_cap") && (
                      <th
                        className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                        onClick={() => {
                          setSortBy("market_cap");
                          setSortOrder(
                            sortBy === "market_cap" && sortOrder === "desc"
                              ? "asc"
                              : "desc"
                          );
                        }}
                      >
                        Market Cap
                      </th>
                    )}
                    {visibleColumns.includes("volume") && (
                      <th
                        className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                        onClick={() => {
                          setSortBy("volume");
                          setSortOrder(
                            sortBy === "volume" && sortOrder === "desc"
                              ? "asc"
                              : "desc"
                          );
                        }}
                      >
                        Volume(24h)
                      </th>
                    )}
                    {visibleColumns.includes("supply") && (
                      <th
                        className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                        onClick={() => {
                          setSortBy("supply");
                          setSortOrder(
                            sortBy === "supply" && sortOrder === "desc"
                              ? "asc"
                              : "desc"
                          );
                        }}
                      >
                        Circulating Supply
                      </th>
                    )}
                    {visibleColumns.includes("rpoints") && (
                      <th
                        className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40 cursor-pointer"
                        onClick={() => {
                          setSortBy("rpoints");
                          setSortOrder(
                            sortBy === "rpoints" && sortOrder === "desc"
                              ? "asc"
                              : "desc"
                          );
                        }}
                      >
                        R-Points
                      </th>
                    )}
                    {visibleColumns.includes("categories") &&
                      activeTab !== "all" && (
                        <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                          Categories
                        </th>
                      )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {combinedData.map((coin, index) => (
                    <tr
                      key={coin.coin}
                      className="hover:bg-blue-500/10 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-gray-900/40 py-4 px-6 whitespace-nowrap text-gray-400">
                        {index + 1}
                      </td>
                      <td className="sticky left-[40px] lg:left-[50px] z-10 bg-gray-900/40 py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {coin.marketData?.image ? (
                            <Image
                              src={coin.marketData.image}
                              alt={coin.coin}
                              width={30}
                              height={30}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                              <span className="text-xs text-blue-300">
                                {coin.coin.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-gray-200 font-medium">
                            {coin.coin}
                          </span>
                        </div>
                      </td>
                      {visibleColumns.includes("price") && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="text-gray-200">
                            $
                            {formatNumber(coin.marketData?.price || 0, "price")}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("24h") && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`${
                              (coin.marketData?.percent_change_24h || 0) <= 0
                                ? "text-red-400"
                                : "text-green-400"
                            } flex items-center gap-1`}
                          >
                            <span className="text-[10px]">
                              {(coin.marketData?.percent_change_24h || 0) <= 0
                                ? "▼"
                                : "▲"}
                            </span>
                            {formatNumber(
                              Math.abs(
                                coin.marketData?.percent_change_24h ?? 0
                              ),
                              "percentage"
                            )}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("market_cap") && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="text-gray-200">
                            $
                            {formatNumber(
                              coin.marketData?.market_cap || 0,
                              "marketcap"
                            )}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("volume") && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="text-gray-200">
                            $
                            {formatNumber(
                              coin.marketData?.volume_24h || 0,
                              "volume"
                            )}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("supply") && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="text-gray-200">
                            {formatNumber(
                              coin.marketData?.circulating_supply || 0,
                              "volume"
                            )}{" "}
                            {coin.marketData?.symbol}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("rpoints") && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="text-cyan-200 font-bold">
                            {coin.rpoints}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("categories") &&
                        activeTab !== "all" && (
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
                        )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import { useState, useMemo, useEffect } from "react";
import { useCoinData, useKnowledgeData, CoinData } from "@/hooks/useCoinData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Coins,
  DollarSign,
  Home,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom Badge component
const Badge = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
};

// Define market cap categories
type MarketCapCategory = {
  id: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  min?: number;
  max?: number;
};

const MARKET_CAP_CATEGORIES: MarketCapCategory[] = [
  {
    id: "large",
    min: 10_000_000_000, // $10B+
    label: "Large Cap",
    description: "Market cap of $10 billion or more",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  {
    id: "medium",
    min: 1_000_000_000, // $1B-$10B
    max: 10_000_000_000,
    label: "Medium Cap",
    description: "Market cap between $1 billion and $10 billion",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "small",
    min: 100_000_000, // $100M-$1B
    max: 1_000_000_000,
    label: "Small Cap",
    description: "Market cap between $100 million and $1 billion",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  {
    id: "micro",
    max: 100_000_000, // Below $100M
    label: "Micro Cap",
    description: "Market cap below $100 million",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
];

// Format number for display
function formatNumberDisplay(
  num: number | undefined | null,
  options: { notation?: Intl.NumberFormatOptions["notation"] } = {}
) {
  if (num === undefined || num === null) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: options.notation || "compact",
    maximumFractionDigits: 2,
  }).format(num);
}

// Format percentage
function formatPercentDisplay(num: number | undefined | null) {
  if (num === undefined || num === null) return "N/A";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

// Format price with appropriate decimal places
function formatPriceDisplay(price: number | undefined | null) {
  if (price === undefined || price === null) return "N/A";

  // For very small numbers, use more decimal places
  if (price < 0.000001) return "$" + price.toFixed(10).replace(/\.?0+$/, "");
  if (price < 0.00001) return "$" + price.toFixed(8).replace(/\.?0+$/, "");
  if (price < 0.0001) return "$" + price.toFixed(7).replace(/\.?0+$/, "");
  if (price < 0.001) return "$" + price.toFixed(6).replace(/\.?0+$/, "");
  if (price < 0.01) return "$" + price.toFixed(5).replace(/\.?0+$/, "");
  if (price < 0.1) return "$" + price.toFixed(4).replace(/\.?0+$/, "");
  if (price < 1) return "$" + price.toFixed(3).replace(/\.?0+$/, "");
  if (price < 10) return "$" + price.toFixed(2);

  // For larger numbers use standard formatting
  return (
    "$" +
    price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function MarketCapPage() {
  const [activeCategory, setActiveCategory] = useState<string>("large");
  const [sortColumn, setSortColumn] = useState<string>("market_cap");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Set initial category from sessionStorage if available
  useEffect(() => {
    try {
      const savedCategory = sessionStorage.getItem("selectedMarketCap");
      if (
        savedCategory &&
        MARKET_CAP_CATEGORIES.some((cat) => cat.id === savedCategory)
      ) {
        setActiveCategory(savedCategory);
        // Clear the stored value after using it
        sessionStorage.removeItem("selectedMarketCap");
      }
    } catch (error) {
      console.error("Failed to read from sessionStorage:", error);
    }
  }, []);

  // Get current category info
  const currentCategory = useMemo(
    () =>
      MARKET_CAP_CATEGORIES.find((cat) => cat.id === activeCategory) ||
      MARKET_CAP_CATEGORIES[0],
    [activeCategory]
  );

  // Get knowledge data
  const { data: knowledgeData, isLoading: knowledgeLoading } =
    useKnowledgeData();

  // Extract unique symbols from knowledge data
  const symbols = useMemo(() => {
    if (!knowledgeData) return [];

    const symbolSet = new Set<string>();
    knowledgeData.forEach((item) => {
      if (item.llm_answer && item.llm_answer.projects) {
        item.llm_answer.projects.forEach((project) => {
          if (project.coin_or_project) {
            symbolSet.add(project.coin_or_project.toLowerCase());
          }
        });
      }
    });

    return Array.from(symbolSet);
  }, [knowledgeData]);

  // Get coin data
  const { data: coinData, isLoading: coinDataLoading } = useCoinData(
    symbols,
    0
  );

  // Create knowledge map
  const knowledgeMap = useMemo(() => {
    if (!knowledgeData) return {};

    const map: Record<string, unknown> = {};
    knowledgeData.forEach((item) => {
      if (item.llm_answer && item.llm_answer.projects) {
        item.llm_answer.projects.forEach((project) => {
          if (project.coin_or_project) {
            map[project.coin_or_project.toLowerCase()] = project;
          }
        });
      }
    });

    return map;
  }, [knowledgeData]);

  // Check if a coin has knowledge entries
  const hasKnowledgeEntry = useMemo(() => {
    return (coin: CoinData) => {
      if (!coin || !coin.symbol) return false;

      const coinSymbol = coin.symbol.toLowerCase();
      const coinName = coin.name?.toLowerCase() || "";

      return Object.keys(knowledgeMap).some(
        (key) =>
          key === coinSymbol ||
          coinName.includes(key) ||
          key.includes(coinSymbol)
      );
    };
  }, [knowledgeMap]);

  // Filter and sort coins
  const filteredCoins = useMemo(() => {
    if (!coinData?.data || !currentCategory) return [];

    const minValue = currentCategory.min || 0;
    const maxValue = currentCategory.max || Infinity;

    // Filter by market cap
    const filteredByCategory = coinData.data.filter((coin) => {
      const marketCap = coin.market_cap;

      if (activeCategory === "large") {
        return marketCap >= minValue;
      } else if (activeCategory === "medium") {
        return marketCap >= minValue && marketCap < maxValue;
      } else if (activeCategory === "small") {
        return marketCap >= minValue && marketCap < maxValue;
      } else if (activeCategory === "micro") {
        return marketCap < maxValue;
      }

      return false;
    });

    // Sort coins
    return [...filteredByCategory].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      // Handle different property names
      if (sortColumn === "price") {
        valA = a.price || a.current_price || 0;
        valB = b.price || b.current_price || 0;
      } else if (sortColumn === "volume_24h") {
        valA = a.volume_24h || a.total_volume || 0;
        valB = b.volume_24h || b.total_volume || 0;
      } else if (sortColumn === "percent_change_24h") {
        valA = a.percent_change_24h || a.price_change_percentage_24h || 0;
        valB = b.percent_change_24h || b.price_change_percentage_24h || 0;
      } else if (sortColumn === "market_cap") {
        valA = a.market_cap || 0;
        valB = b.market_cap || 0;
      } else if (sortColumn === "market_cap_rank") {
        valA = a.market_cap_rank || 0;
        valB = b.market_cap_rank || 0;
      } else {
        // Default to market cap if property not recognized
        valA = a.market_cap || 0;
        valB = b.market_cap || 0;
      }

      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [
    coinData?.data,
    activeCategory,
    currentCategory,
    sortColumn,
    sortDirection,
  ]);

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Loading state
  if (coinDataLoading || knowledgeLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-blue-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 bg-gradient-to-br from-black via-blue-900/20 to-black relative overflow-hidden pb-10">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Breadcrumb navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Market Cap</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
            {currentCategory.label} Cryptocurrencies
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-3xl">
            {currentCategory.description} – These cryptocurrencies are
            categorized based on their market capitalization value, which is
            calculated by multiplying the current price by the circulating
            supply.
          </p>
        </div>

        {/* Category navigation tabs */}
        <Tabs
          value={activeCategory}
          className="mb-8"
          onValueChange={(value) => setActiveCategory(value)}
        >
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:grid-cols-4 gap-2">
            {MARKET_CAP_CATEGORIES.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className={
                  activeCategory === category.id ? category.bgColor : ""
                }
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Market cap summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <Card className={`bg-black/50 ${currentCategory.borderColor} border`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coins className="w-4 h-4" /> Coins in this category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentCategory.color}`}>
                {filteredCoins.length}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-black/50 ${currentCategory.borderColor} border`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Category Definition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm ${currentCategory.color}`}>
                {currentCategory.description}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-black/50 ${currentCategory.borderColor} border`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Market Cap Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm ${currentCategory.color}`}>
                {activeCategory === "large"
                  ? `Above ${formatNumberDisplay(currentCategory.min)}`
                  : activeCategory === "micro"
                  ? `Below ${formatNumberDisplay(currentCategory.max)}`
                  : `${formatNumberDisplay(
                      currentCategory.min
                    )} - ${formatNumberDisplay(currentCategory.max)}`}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-black/50 ${currentCategory.borderColor} border`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" /> Risk Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm ${currentCategory.color}`}>
                {activeCategory === "large"
                  ? "Lower risk, more established"
                  : activeCategory === "medium"
                  ? "Moderate risk, growing projects"
                  : activeCategory === "small"
                  ? "Higher risk, emerging projects"
                  : "Highest risk, new projects"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coin table */}
        <Card className="bg-black/50 border-blue-500/20 border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center gap-2">
                      Price
                      {sortColumn === "price" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("market_cap")}
                  >
                    <div className="flex items-center gap-2">
                      Market Cap
                      {sortColumn === "market_cap" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("percent_change_24h")}
                  >
                    <div className="flex items-center gap-2">
                      24h %
                      {sortColumn === "percent_change_24h" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("volume_24h")}
                  >
                    <div className="flex items-center gap-2">
                      Volume (24h)
                      {sortColumn === "volume_24h" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead>Knowledge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoins.length > 0 ? (
                  filteredCoins.map((coin, index) => (
                    <TableRow
                      key={`coin-${coin.id || coin.symbol || index}`}
                      className="hover:bg-blue-900/10"
                    >
                      <TableCell className="font-medium">
                        {coin.market_cap_rank || index + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/coin/${coin.coingecko_id || coin.id}`}
                          className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                        >
                          {coin.image && (
                            <div className="relative w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                              <Image
                                src={coin.image}
                                alt={coin.name || "Coin"}
                                width={24}
                                height={24}
                                className="object-contain"
                                style={{ width: "100%", height: "auto" }}
                              />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span>{coin.name}</span>
                            <span className="text-xs text-gray-500">
                              {coin.symbol?.toUpperCase()}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {formatPriceDisplay(coin.price || coin.current_price)}
                      </TableCell>
                      <TableCell>
                        {formatNumberDisplay(coin.market_cap)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`flex items-center gap-1 
                          ${
                            (coin.percent_change_24h ||
                              coin.price_change_percentage_24h) >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {(coin.percent_change_24h ||
                            coin.price_change_percentage_24h) >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {formatPercentDisplay(
                            coin.percent_change_24h ||
                              coin.price_change_percentage_24h
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatNumberDisplay(
                          coin.volume_24h || coin.total_volume
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Knowledge indicator */}
                        <div>
                          {hasKnowledgeEntry(coin) ? (
                            <Badge
                              className={`${currentCategory.bgColor} ${currentCategory.color}`}
                            >
                              Knowledge Available
                            </Badge>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              No data
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
                      No coins found in this category
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </main>
  );
}

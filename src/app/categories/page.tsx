"use client";

import { useMemo, useState, Suspense } from "react";
import { useKnowledgeData } from "@/hooks/useCoinData";
import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeItem, Project } from "@/types/knowledge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState, CardSkeleton } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Filter, X, ArrowRight } from "lucide-react";
import Link from "next/link";

type SortOption = "rpoints" | "mentions" | "coins" | "recent";

function CategoriesContent() {
  const { data: knowledge = [], isLoading } = useKnowledgeData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("rpoints");
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Process data to get category insights
  const categoryData = useMemo(() => {
    const categories = new Map<
      string,
      {
        id: string;
        name: string; // Store normalized name
        displayName: string; // Store original display name
        coins: Set<string>;
        totalRpoints: number;
        mentions: number;
        marketCapDistribution: {
          large: number;
          medium: number;
          small: number;
        };
        recentActivity: number;
      }
    >();

    // Normalize category names to avoid duplicates like "meme coin", "meme", etc.
    const normalizeCategory = (
      category: string
    ): { id: string; name: string; displayName: string } => {
      const normalized = category.toLowerCase().trim();

      // Handle special cases for common categories with variations
      if (
        normalized === "meme" ||
        normalized === "meme coin" ||
        normalized === "meme coins" ||
        normalized === "memes" ||
        normalized === "memecoin"
      ) {
        return {
          id: "meme-token",
          name: "meme-token",
          displayName: "Meme Coins",
        };
      }

      if (normalized === "defi" || normalized === "decentralized finance") {
        return {
          id: "decentralized-finance-defi",
          name: "decentralized-finance-defi",
          displayName: "DeFi",
        };
      }

      if (normalized === "ai" || normalized === "artificial intelligence") {
        return {
          id: "artificial-intelligence",
          name: "artificial-intelligence",
          displayName: "AI & Machine Learning",
        };
      }

      if (
        normalized === "layer 1" ||
        normalized === "l1" ||
        normalized === "layer-1"
      ) {
        return {
          id: "layer-1",
          name: "layer-1",
          displayName: "Layer 1",
        };
      }

      if (
        normalized === "gaming" ||
        normalized === "games" ||
        normalized === "game" ||
        normalized === "p2e" ||
        normalized === "play to earn"
      ) {
        return {
          id: "gaming-entertainment-social",
          name: "gaming-entertainment-social",
          displayName: "Gaming & Entertainment",
        };
      }

      if (
        normalized === "exchange token" ||
        normalized === "exchange tokens" ||
        normalized === "exchange"
      ) {
        return {
          id: "centralized-exchange-token-cex",
          name: "centralized-exchange-token-cex",
          displayName: "Exchange Tokens",
        };
      }

      if (
        normalized === "payment" ||
        normalized === "payments" ||
        normalized === "payment solution" ||
        normalized === "payment solutions" ||
        normalized === "payment protocol" ||
        normalized === "transaction" ||
        normalized === "remittance" ||
        normalized === "cross-border" ||
        normalized === "cross border" ||
        normalized === "crossborder"
      ) {
        return {
          id: "payment-solutions",
          name: "payment-solutions",
          displayName: "Payment Solutions",
        };
      }

      if (
        normalized === "privacy" ||
        normalized === "privacy coin" ||
        normalized === "privacy coins" ||
        normalized === "private" ||
        normalized === "anonymity"
      ) {
        return {
          id: "privacy-coins",
          name: "privacy-coins",
          displayName: "Privacy Coins",
        };
      }

      if (
        normalized === "infrastructure" ||
        normalized === "infra" ||
        normalized === "blockchain infrastructure" ||
        normalized === "web3 infrastructure"
      ) {
        return {
          id: "infrastructure",
          name: "infrastructure",
          displayName: "Infrastructure",
        };
      }

      if (
        normalized === "oracle" ||
        normalized === "oracles" ||
        normalized === "data oracle" ||
        normalized === "price oracle" ||
        normalized === "price feed"
      ) {
        return {
          id: "oracle",
          name: "oracle",
          displayName: "Oracles",
        };
      }

      if (
        normalized === "nft" ||
        normalized === "nfts" ||
        normalized === "non-fungible token" ||
        normalized === "non fungible token" ||
        normalized === "collectible" ||
        normalized === "collectibles"
      ) {
        return {
          id: "non-fungible-tokens-nft",
          name: "non-fungible-tokens-nft",
          displayName: "NFTs & Collectibles",
        };
      }

      if (
        normalized === "staking" ||
        normalized === "stake" ||
        normalized === "staking platform" ||
        normalized === "staking protocol" ||
        normalized === "validator" ||
        normalized === "pos"
      ) {
        return {
          id: "staking-pool",
          name: "staking-pool",
          displayName: "Staking & Yield",
        };
      }

      if (
        normalized === "scaling" ||
        normalized === "layer 2" ||
        normalized === "l2" ||
        normalized === "rollup" ||
        normalized === "rollups" ||
        normalized === "sidechain" ||
        normalized === "scalability"
      ) {
        return {
          id: "layer-2",
          name: "layer-2",
          displayName: "Layer 2 & Scaling",
        };
      }

      if (
        normalized === "utility" ||
        normalized === "utility token" ||
        normalized === "utility tokens" ||
        normalized === "platform token"
      ) {
        return {
          id: "utility-token",
          name: "utility-token",
          displayName: "Utility Tokens",
        };
      }

      // Default case
      return {
        id: normalized.replace(/\s+/g, "-"),
        name: normalized.replace(/\s+/g, "-"),
        displayName: category,
      };
    };

    knowledge.forEach((item: KnowledgeItem) => {
      const date = new Date(item.date);
      const isRecent =
        !isNaN(date.getTime()) &&
        new Date().getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;

      item.llm_answer.projects.forEach((project: Project) => {
        project.category?.forEach((category: string) => {
          if (!category || typeof category !== "string") return;

          // Normalize the category
          const normalizedCategory = normalizeCategory(category);
          const categoryKey = normalizedCategory.name;

          if (!categories.has(categoryKey)) {
            categories.set(categoryKey, {
              id: normalizedCategory.id,
              name: normalizedCategory.name,
              displayName: normalizedCategory.displayName,
              coins: new Set(),
              totalRpoints: 0,
              mentions: 0,
              marketCapDistribution: { large: 0, medium: 0, small: 0 },
              recentActivity: 0,
            });
          }

          const categoryInfo = categories.get(categoryKey)!;
          if (project.coin_or_project) {
            categoryInfo.coins.add(project.coin_or_project);
          }
          const rpoints = Number(project.rpoints) || 0;
          categoryInfo.totalRpoints += isNaN(rpoints) ? 0 : rpoints;
          categoryInfo.mentions += 1;

          const marketcap = (project.marketcap || "").toLowerCase();
          if (["large", "medium", "small"].includes(marketcap)) {
            categoryInfo.marketCapDistribution[
              marketcap as keyof typeof categoryInfo.marketCapDistribution
            ] += 1;
          }

          if (isRecent) categoryInfo.recentActivity += 1;
        });
      });
    });

    return Array.from(categories.entries())
      .map(([key, data]) => ({
        key,
        id: data.id,
        name: data.displayName, // Use display name for UI
        coins: Array.from(data.coins),
        totalRpoints: Math.round(data.totalRpoints * 100) / 100, // Round to 2 decimal places
        mentions: data.mentions,
        marketCapDistribution: data.marketCapDistribution,
        recentActivity: data.recentActivity,
      }))
      .filter((category) => category.name && category.coins.length > 0) // Filter out empty categories
      .sort((a, b) => b.totalRpoints - a.totalRpoints);
  }, [knowledge]);

  // Get unique category types (e.g., "DeFi", "AI", etc.)
  const categoryTypes = useMemo(() => {
    // Create a map of name -> key to avoid duplicates
    const uniqueCategories = new Map();

    categoryData.forEach((category) => {
      uniqueCategories.set(category.name, category.key);
    });

    return Array.from(uniqueCategories.keys()).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [categoryData]);

  // Filter and sort the categories
  const filteredCategories = useMemo(() => {
    return categoryData
      .filter((category) => {
        // Category filter
        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.includes(category.name);
        if (!matchesCategory) return false;

        // Search filter
        if (!searchTerm) return true;

        const searchTerms = searchTerm
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);

        return searchTerms.every((term) => {
          // Check category name
          if (category.name.toLowerCase().includes(term)) return true;

          // Check coins
          if (category.coins.some((coin) => coin.toLowerCase().includes(term)))
            return true;

          return false;
        });
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "rpoints":
            return b.totalRpoints - a.totalRpoints;
          case "mentions":
            return b.mentions - a.mentions;
          case "coins":
            return b.coins.length - a.coins.length;
          case "recent":
            return b.recentActivity - a.recentActivity;
          default:
            return 0;
        }
      });
  }, [categoryData, searchTerm, sortBy, selectedCategories]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-purple-500">
            Category Insights
          </h1>
          <div className="animate-pulse h-8 w-24 bg-purple-500/20 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
            Category Insights
          </h1>
          <p className="text-gray-400 mt-1">
            {filteredCategories.length} categories found
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-blue-500/10 ring-1 ring-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
            onClick={() => setShowCategorySelector(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {selectedCategories.length > 0
              ? `${selectedCategories.length} Selected`
              : "Filter Categories"}
          </Button>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-black/50 backdrop-blur-sm px-4 py-2 ring-1 ring-cyan-500/30 accent-cyan-500 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
            >
              <option value="rpoints">Sort by Relevance</option>
              <option value="mentions">Sort by Mentions</option>
              <option value="coins">Sort by Coin Count</option>
              <option value="recent">Sort by Recent Activity</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                className="w-4 h-4 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Search input */}
          <div className="relative flex items-center w-full md:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories or coins..."
              className="w-full md:w-64 bg-black/50 backdrop-blur-sm rounded-lg py-2 pl-10 pr-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 ring-1 ring-teal-500/30 focus:ring-teal-500/50 transition-all duration-200"
            />
            <svg
              className="absolute left-3 w-5 h-5 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, index) => {
              // Determine color accent based on index
              const colorAccents = [
                {
                  border: "ring-blue-500/30",
                  bg: "bg-blue-500/10",
                  text: "text-blue-300",
                  textTitle: "text-blue-100",
                  ring: "ring-blue-500/20",
                  hover: "hover:ring-blue-500/30",
                },
                {
                  border: "ring-cyan-500/30",
                  bg: "bg-cyan-500/10",
                  text: "text-cyan-300",
                  textTitle: "text-cyan-100",
                  ring: "ring-cyan-500/20",
                  hover: "hover:ring-cyan-500/30",
                },
                {
                  border: "ring-teal-500/30",
                  bg: "bg-teal-500/10",
                  text: "text-teal-300",
                  textTitle: "text-teal-100",
                  ring: "ring-teal-500/20",
                  hover: "hover:ring-teal-500/30",
                },
                {
                  border: "ring-green-500/30",
                  bg: "bg-green-500/10",
                  text: "text-green-300",
                  textTitle: "text-green-100",
                  ring: "ring-green-500/20",
                  hover: "hover:ring-green-500/30",
                },
              ];

              const colorAccent = colorAccents[index % colorAccents.length];

              return (
                <motion.div
                  key={`category-card-${category.key}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`bg-black/80 backdrop-blur-sm ring-2 ${colorAccent.ring} ${colorAccent.hover} rounded-xl overflow-hidden transition-all duration-300 group`}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <h3
                        className={`text-lg font-semibold ${colorAccent.textTitle}`}
                      >
                        {category.name}
                      </h3>
                      <div
                        className={`px-2.5 py-1 rounded-lg ${colorAccent.bg} ${colorAccent.text} text-xs font-medium ring-1 ${colorAccent.border}`}
                      >
                        {category.coins.length} Coins
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">
                          Relevance
                        </div>
                        <div className={`font-semibold ${colorAccent.text}`}>
                          {category.totalRpoints.toLocaleString()} pts
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">
                          Mentions
                        </div>
                        <div className={`font-semibold ${colorAccent.text}`}>
                          {category.mentions}
                        </div>
                      </div>
                    </div>

                    {/* Coins */}
                    <div className="mt-3">
                      <div className="text-sm text-gray-400 mb-2">
                        Recent Projects
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {category.coins.slice(0, 3).map((coin) => (
                          <div
                            key={coin}
                            className={`px-2 py-1 ${colorAccent.bg} ring-1 ${colorAccent.border} rounded-md text-xs font-medium ${colorAccent.text}`}
                          >
                            {coin}
                          </div>
                        ))}
                        {category.coins.length > 3 && (
                          <div className="px-2 py-1 bg-black/40 ring-1 ring-gray-500/20 rounded-md text-xs font-medium text-gray-400">
                            +{category.coins.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View all link */}
                    <Link href={`/categories/${category.id}`}>
                      <Button
                        className={`mt-5 w-full bg-gradient-to-r ${colorAccent.bg} hover:brightness-110 ring-1 ${colorAccent.border} hover:ring-opacity-70 ${colorAccent.text} transition-all`}
                        variant="outline"
                      >
                        View Category
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-3 py-10 text-center">
              <div className="bg-black/80 backdrop-blur-sm ring-2 ring-blue-500/20 p-8 rounded-xl mx-auto max-w-lg">
                <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400 mb-2">
                  No Categories Found
                </h3>
                <p className="text-gray-400 mb-4">
                  Try adjusting your filters or search term to see more results.
                </p>
                <Button
                  variant="outline"
                  className="bg-blue-500/10 ring-1 ring-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategories([]);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Category selector modal */}
      <AnimatePresence>
        {showCategorySelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center mt-20 p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCategorySelector(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black/80 backdrop-blur-sm ring-2 ring-blue-500/20 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
                  Select Categories
                </h2>
                <button
                  onClick={() => setShowCategorySelector(false)}
                  className="p-2 hover:glass-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedCategories([])}
                  className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategories.length === 0
                      ? "bg-blue-500 text-white"
                      : "bg-black/40 ring-1 ring-gray-700 text-gray-400 hover:text-white hover:bg-blue-500/10"
                  }`}
                >
                  All Categories
                </button>
                {categoryTypes.map((category) => (
                  <button
                    key={`category-btn-${category
                      .replace(/\s+/g, "-")
                      .toLowerCase()}`}
                    onClick={() => {
                      setSelectedCategories((prev) =>
                        prev.includes(category)
                          ? prev.filter((c) => c !== category)
                          : [...prev, category]
                      );
                    }}
                    className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategories.includes(category)
                        ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                        : "bg-black/40 ring-1 ring-gray-700 text-gray-400 hover:text-white hover:bg-blue-500/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-black via-blue-950/20 to-black relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-teal-500/10 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ErrorBoundary>
          <Suspense fallback={<LoadingState />}>
            <CategoriesContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

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

    knowledge.forEach((item: KnowledgeItem) => {
      const date = new Date(item.date);
      const isRecent =
        !isNaN(date.getTime()) &&
        new Date().getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;

      item.llm_answer.projects.forEach((project: Project) => {
        project.category?.forEach((category: string) => {
          if (!category || typeof category !== "string") return;

          if (!categories.has(category)) {
            categories.set(category, {
              id: category.toLowerCase(),
              coins: new Set(),
              totalRpoints: 0,
              mentions: 0,
              marketCapDistribution: { large: 0, medium: 0, small: 0 },
              recentActivity: 0,
            });
          }

          const categoryInfo = categories.get(category)!;
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
      .map(([name, data]) => ({
        name,
        id: data.id || name.toLowerCase(),
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
    return Array.from(new Set(categoryData.map((cat) => cat.name))).sort(
      (a, b) => a.localeCompare(b)
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

  // Category selector modal
  const CategorySelectorModal = () => {
    if (!showCategorySelector) return null;

    return (
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
          className="bg-gray-800/90 backdrop-blur-xl rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-200">
              Select Categories
            </h2>
            <button
              onClick={() => setShowCategorySelector(false)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
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
                  : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              All Categories
            </button>
            {categoryTypes.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategories((prev) =>
                    prev.includes(category)
                      ? prev.filter((c) => c !== category)
                      : [...prev, category]
                  );
                }}
                className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategories.includes(category)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                {category}
                {selectedCategories.includes(category) && (
                  <span className="ml-2 text-xs bg-blue-600 px-1.5 py-0.5 rounded">
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ErrorBoundary>
          <Suspense fallback={<LoadingState />}>
            <div className="flex flex-col space-y-8">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  Category Analysis
                </h1>
                <div className="text-sm text-gray-400">
                  {filteredCategories.length} categories
                </div>
              </div>

              {/* Filter Bar */}
              <div className="space-y-4">
                {/* Search and Sort */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full bg-gray-900/60 border border-blue-500/30 rounded-lg py-2 px-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 relative z-30"
                    />
                  </div>

                  {/* Sort */}
                  <div className="w-full sm:w-48 relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full appearance-none bg-gray-900/60 border border-purple-500/30 rounded-lg py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-200 relative z-30"
                    >
                      <option value="rpoints">Sort by R-Points</option>
                      <option value="mentions">Sort by Mentions</option>
                      <option value="coins">Sort by Coin Count</option>
                      <option value="recent">Sort by Recent Activity</option>
                    </select>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    onClick={() => setShowCategorySelector(true)}
                    className="bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter Categories
                  </Button>

                  {selectedCategories.length > 0 ? (
                    selectedCategories.map((category) => (
                      <span
                        key={category}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-2"
                      >
                        {category}
                        <button
                          onClick={() =>
                            setSelectedCategories((prev) =>
                              prev.filter((c) => c !== category)
                            )
                          }
                          className="hover:text-blue-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">
                      All Categories
                    </span>
                  )}
                </div>
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category, index) => {
                  // Special case mappings for commonly searched categories
                  const specialCategoryMapping: Record<string, string> = {
                    "meme coins": "meme-token",
                    "layer 1": "layer-1",
                    "layer-1": "layer-1",
                    ai: "artificial-intelligence-ai",
                    "artificial intelligence": "artificial-intelligence-ai",
                    gaming: "gaming-entertainment-social",
                    defi: "decentralized-finance-defi",
                  };

                  // Check if we have a special mapping for this category
                  const categoryPath =
                    specialCategoryMapping[category.name.toLowerCase()] ||
                    category.id ||
                    category.name.toLowerCase();

                  return (
                    <Link
                      key={category.name}
                      href={`/categories/${encodeURIComponent(categoryPath)}`}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-semibold text-cyan-200">
                            {category.name}
                          </h2>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-900/30 text-blue-300 border border-blue-500/30">
                            {category.coins.length.toString()} Coins
                          </span>
                        </div>

                        {/* Category Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-sm text-gray-400">
                              Total R-Points
                            </div>
                            <div className="text-lg font-semibold text-blue-300">
                              {category.totalRpoints.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-sm text-gray-400">
                              Mentions
                            </div>
                            <div className="text-lg font-semibold text-purple-300">
                              {category.mentions.toString()}
                            </div>
                          </div>
                        </div>

                        {/* Market Cap Distribution */}
                        <div className="mb-4">
                          <div className="text-sm text-gray-400 mb-2">
                            Market Cap Distribution
                          </div>
                          <div className="flex gap-2">
                            {Object.entries(category.marketCapDistribution).map(
                              ([cap, count]) => (
                                <div
                                  key={cap}
                                  className={`flex-1 rounded-lg p-2 text-center ${
                                    cap === "large"
                                      ? "bg-green-900/30 text-green-300 border border-green-500/30"
                                      : cap === "medium"
                                      ? "bg-yellow-900/30 text-yellow-300 border border-yellow-500/30"
                                      : "bg-red-900/30 text-red-300 border border-red-500/30"
                                  }`}
                                >
                                  <div className="text-xs capitalize">
                                    {cap}
                                  </div>
                                  <div className="text-sm font-medium">
                                    {count}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-sm text-gray-400">
                            Recent Activity (7d)
                          </div>
                          <div className="text-lg font-semibold text-pink-300">
                            {category.recentActivity} mentions
                          </div>
                        </div>

                        {/* Top Coins */}
                        <div className="mt-4">
                          <div className="text-sm text-gray-400 mb-2">
                            Top Coins
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {category.coins.slice(0, 5).map((coin) => (
                              <span
                                key={coin}
                                className="px-2 py-1 rounded-full text-xs bg-gray-900/50 text-gray-300 border border-gray-700/50"
                              >
                                {coin}
                              </span>
                            ))}
                            {category.coins.length > 5 && (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-900/50 text-gray-400">
                                +{category.coins.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* View Details Link */}
                        <div className="mt-5 pt-4 border-t border-gray-700/50 text-right">
                          <span className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 font-medium group-hover:underline">
                            View Analytics{" "}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Category Selector Modal */}
            <AnimatePresence>
              {showCategorySelector && <CategorySelectorModal />}
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
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

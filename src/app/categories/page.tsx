"use client";

import { useMemo, useState, Suspense } from "react";
import { useContextKnowledge } from "@/hooks/useContextKnowledge";
import type { KnowledgeItem, Project } from "@/types/knowledge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState, CardSkeleton } from "@/components/LoadingState";
import { Filter, X, ArrowRight } from "lucide-react";
import Link from "next/link";

type SortOption = "rpoints" | "mentions" | "coins" | "recent";

function CategoriesContent() {
  const { data: knowledge = [], isLoading } = useContextKnowledge();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("rpoints");
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  console.log("Knowledge data count:", knowledge.length);

  // Process data to get category insights
  const categoryData = useMemo(() => {
    console.log("Processing knowledge data:", knowledge.length);

    const categories = new Map<
      string,
      {
        id: string;
        name: string;
        displayName: string;
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

    // Normalize category names to avoid duplicates
    const normalizeCategory = (
      category: string
    ): { id: string; name: string; displayName: string } => {
      const normalized = category.toLowerCase().trim();

      // Special cases
      if (
        ["meme", "meme coin", "meme coins", "memes", "memecoin"].includes(
          normalized
        )
      ) {
        return {
          id: "meme-token",
          name: "meme-token",
          displayName: "Meme Coins",
        };
      }

      if (["defi", "decentralized finance"].includes(normalized)) {
        return {
          id: "decentralized-finance-defi",
          name: "decentralized-finance-defi",
          displayName: "DeFi",
        };
      }

      // Default case
      return {
        id: normalized.replace(/\s+/g, "-"),
        name: normalized.replace(/\s+/g, "-"),
        displayName: category,
      };
    };

    // Process each knowledge item
    knowledge.forEach((item: KnowledgeItem) => {
      const date = new Date(item.date);
      const isRecent =
        !isNaN(date.getTime()) &&
        new Date().getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;

      // Skip items without projects
      if (!item.llm_answer || !item.llm_answer.projects) return;

      item.llm_answer.projects.forEach((project: Project) => {
        if (!project.category || !Array.isArray(project.category)) return;

        project.category.forEach((category: string) => {
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

    console.log("Categories map size:", categories.size);

    return Array.from(categories.entries())
      .map(([key, data]) => ({
        key,
        id: data.id,
        name: data.displayName,
        coins: Array.from(data.coins),
        totalRpoints: Math.round(data.totalRpoints * 100) / 100,
        mentions: data.mentions,
        marketCapDistribution: data.marketCapDistribution,
        recentActivity: data.recentActivity,
      }))
      .filter((category) => category.name && category.coins.length > 0)
      .sort((a, b) => b.totalRpoints - a.totalRpoints);
  }, [knowledge]);

  console.log("Processed categories:", categoryData.length);

  // Get unique category types
  const categoryTypes = useMemo(() => {
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

  console.log("Filtered categories:", filteredCategories.length);

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

  // Define color accents for cards
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

  return (
    <div className="space-y-6" style={{ position: "relative", zIndex: 10 }}>
      {/* Debug info */}
      {knowledge.length === 0 && (
        <div className="bg-red-500/20 p-4 rounded-lg text-red-300">
          No knowledge data loaded. Check API connection.
        </div>
      )}

      {/* Header */}
      <div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        style={{ position: "relative", zIndex: 20 }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
            Category Insights
          </h1>
          <p className="text-gray-400 mt-1">
            {filteredCategories.length} categories found
          </p>
        </div>

        {/* Filters */}
        <div
          className="flex flex-wrap gap-2"
          style={{ position: "relative", zIndex: 30 }}
        >
          {/* Filter button */}
          <button
            onClick={() => setShowCategorySelector(true)}
            className="bg-blue-500/10 ring-1 ring-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 py-2 px-4 rounded flex items-center justify-center"
            style={{ position: "relative", zIndex: 31 }}
          >
            <Filter className="w-4 h-4 mr-2" />
            {selectedCategories.length > 0
              ? `${selectedCategories.length} Selected`
              : "Filter Categories"}
          </button>

          {/* Sort dropdown */}
          <div
            className="relative"
            style={{ position: "relative", zIndex: 31 }}
          >
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-black/50 backdrop-blur-sm px-4 py-2 ring-1 ring-cyan-500/30 accent-cyan-500 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
              style={{ position: "relative", zIndex: 32 }}
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
          <div
            className="relative flex items-center w-full md:w-auto"
            style={{ position: "relative", zIndex: 31 }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories or coins..."
              className="w-full md:w-64 bg-black/50 backdrop-blur-sm rounded-lg py-2 pl-10 pr-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 ring-1 ring-teal-500/30 focus:ring-teal-500/50 transition-all duration-200"
              style={{ position: "relative", zIndex: 32 }}
            />
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ zIndex: 33 }}
            >
              <svg
                className="w-5 h-5 text-teal-500"
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
      </div>

      {/* Category Cards */}
      {filteredCategories.length === 0 ? (
        <div className="py-10 text-center">
          <div className="bg-black/80 backdrop-blur-sm ring-2 ring-blue-500/20 p-8 rounded-xl mx-auto max-w-lg">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400 mb-2">
              No Categories Found
            </h3>
            <p className="text-gray-400 mb-4">
              Try adjusting your filters or search term to see more results.
            </p>
            <button
              className="bg-blue-500/10 ring-1 ring-blue-500/30 text-blue-300 hover:bg-blue-500/20 py-2 px-4 rounded"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategories([]);
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          style={{ position: "relative", zIndex: 10 }}
        >
          {filteredCategories.map((category, index) => {
            const colorAccent = colorAccents[index % colorAccents.length];

            return (
              <div
                key={`category-card-${category.key}`}
                className={`bg-black/80 backdrop-blur-sm ring-2 ${colorAccent.ring} ${colorAccent.hover} rounded-xl overflow-hidden transition-all duration-300`}
                style={{ position: "relative", zIndex: 15 }}
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
                      <div className="text-sm text-gray-400 mb-1">Mentions</div>
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
                    <button
                      className={`mt-5 w-full bg-gradient-to-r ${colorAccent.bg} hover:brightness-110 ring-1 ${colorAccent.border} hover:ring-opacity-70 ${colorAccent.text} transition-all py-2 rounded-md flex items-center justify-center`}
                    >
                      View Category
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category selector modal */}
      {showCategorySelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center mt-20 p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCategorySelector(false)}
          style={{ position: "fixed", zIndex: 100 }}
        >
          <div
            className="bg-black/80 backdrop-blur-sm ring-2 ring-blue-500/20 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", zIndex: 101 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400">
                Select Categories
              </h2>
              <button
                onClick={() => setShowCategorySelector(false)}
                className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div
      className="min-h-screen pt-24 bg-gradient-to-br from-black via-blue-950/20 to-black relative overflow-hidden"
      style={{ position: "relative", zIndex: 1 }}
    >
      {/* Background Animation */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-teal-500/10 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
      </div>

      {/* This div ensures no overlays block our content */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
      ></div>

      {/* Content */}
      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ zIndex: 10, isolation: "isolate" }}
      >
        <ErrorBoundary>
          <Suspense fallback={<LoadingState />}>
            <CategoriesContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

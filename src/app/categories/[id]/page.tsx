"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useKnowledgeData } from "@/hooks/useCoinData";
import { KnowledgeItem, Project } from "@/types/knowledge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  Users,
  Hash,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import Image from "next/image";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface CategoryDetailData {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  content: string;
  top_3_coins: string[];
  top_3_coins_id: string[];
  updated_at: string;
}

interface CategoryAnalytics {
  coins: string[];
  totalRpoints: number;
  mentions: number;
  marketCapDistribution: {
    large: number;
    medium: number;
    small: number;
  };
  recentActivity: number;
  coinBreakdown: {
    name: string;
    rpoints: number;
    mentions: number;
  }[];
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const categoryId =
    typeof params.id === "string"
      ? decodeURIComponent(params.id).replace(/\s+/g, "-").toLowerCase()
      : "";
  const { data: knowledge = [], isLoading: knowledgeLoading } =
    useKnowledgeData();

  const [categoryData, setCategoryData] = useState<CategoryDetailData | null>(
    null
  );
  const [categoryAnalytics, setCategoryAnalytics] =
    useState<CategoryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Get a display name for the category (for UI purposes)
  const displayName = useMemo(() => {
    if (!categoryId) return "";

    // Special case mappings for known categories
    const specialCategoryIDs = {
      "layer-1": "Layer 1",
      "meme-token": "Meme Token",
      "gaming-entertainment-social": "Gaming & Entertainment",
      "artificial-intelligence-ai": "AI & Machine Learning",
      "decentralized-finance-defi": "DeFi",
    };

    return (
      specialCategoryIDs[categoryId as keyof typeof specialCategoryIDs] ||
      categoryId
    );
  }, [categoryId]);

  // Get back button text and link based on previous path
  const backButtonInfo = useMemo(() => {
    if (!previousPath)
      return { text: "Back to Categories", href: "/categories" };

    if (previousPath.includes("/coin/")) {
      return { text: "Back to Coin", href: previousPath };
    }
    if (previousPath.includes("/categories")) {
      return { text: "Back to Categories", href: "/categories" };
    }
    if (previousPath === "/") {
      return { text: "Back to Home", href: "/" };
    }
    return { text: "Back", href: previousPath };
  }, [previousPath]);

  // Store previous path when component mounts
  useEffect(() => {
    const referrer = document.referrer;
    if (referrer) {
      const url = new URL(referrer);
      setPreviousPath(url.pathname);
    }
  }, []);

  // Process knowledge data for this category
  const processKnowledgeData = useCallback(() => {
    if (!knowledgeLoading && knowledge.length > 0) {
      const coinData = new Map<string, { rpoints: number; mentions: number }>();
      let totalRpoints = 0;
      let totalMentions = 0;
      let recentActivity = 0;
      const marketCapDistribution = { large: 0, medium: 0, small: 0 };
      const categoryCoins = new Set<string>();

      // Create alternate forms of the category name for flexible matching
      const categoryVariants = new Set<string>();

      // Add original category ID and name
      categoryVariants.add(categoryId.toLowerCase());
      if (categoryData?.name) {
        categoryVariants.add(categoryData.name.toLowerCase());
      }

      // Add special mappings variants
      if (
        categoryId === "layer-1" ||
        categoryData?.name?.toLowerCase() === "layer 1"
      ) {
        categoryVariants.add("layer 1");
        categoryVariants.add("layer1");
        categoryVariants.add("l1");
        categoryVariants.add("layer one");
      } else if (
        categoryId === "meme-token" ||
        categoryData?.name?.toLowerCase() === "meme"
      ) {
        categoryVariants.add("meme");
        categoryVariants.add("memes");
        categoryVariants.add("meme coin");
        categoryVariants.add("memecoin");
      } else if (
        categoryId === "gaming-entertainment-social" ||
        categoryData?.name?.toLowerCase().includes("gaming")
      ) {
        categoryVariants.add("gaming");
        categoryVariants.add("game");
        categoryVariants.add("games");
        categoryVariants.add("play to earn");
        categoryVariants.add("p2e");
      } else if (
        categoryId === "artificial-intelligence-ai" ||
        categoryData?.name?.toLowerCase().includes("ai")
      ) {
        categoryVariants.add("ai");
        categoryVariants.add("artificial intelligence");
      } else if (
        categoryId === "decentralized-finance-defi" ||
        categoryData?.name?.toLowerCase().includes("defi")
      ) {
        categoryVariants.add("defi");
        categoryVariants.add("finance");
        categoryVariants.add("decentralized finance");
      } else if (
        categoryId === "payment" ||
        categoryData?.name?.toLowerCase().includes("payment")
      ) {
        categoryVariants.add("payment");
        categoryVariants.add("payments");
        categoryVariants.add("payment solution");
        categoryVariants.add("payment solutions");
        categoryVariants.add("payment protocol");
        categoryVariants.add("transaction");
        categoryVariants.add("remittance");
        categoryVariants.add("cross-border");
        categoryVariants.add("cross border");
      }

      knowledge.forEach((item: KnowledgeItem) => {
        const date = new Date(item.date);
        const isRecent =
          !isNaN(date.getTime()) &&
          new Date().getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;

        item.llm_answer.projects.forEach((project: Project) => {
          // Check if project has categories
          if (!project.category || !Array.isArray(project.category)) {
            return;
          }

          // Normalize project categories
          const projectCategories = project.category.map((c) =>
            (c || "").toLowerCase().trim()
          );

          // Check if any of our category variants match any project category
          const categoryMatches = projectCategories.some(
            (projectCat) =>
              // Direct match with any variant
              categoryVariants.has(projectCat) ||
              // Or partial match for special cases
              (categoryId === "layer-1" && projectCat.includes("layer")) ||
              (categoryId === "meme-token" && projectCat.includes("meme")) ||
              (categoryId === "gaming-entertainment-social" &&
                (projectCat.includes("game") ||
                  projectCat.includes("gaming") ||
                  projectCat.includes("meta"))) ||
              (categoryId === "artificial-intelligence-ai" &&
                (projectCat.includes("ai") ||
                  projectCat.includes("intelligence"))) ||
              (categoryId === "decentralized-finance-defi" &&
                (projectCat.includes("defi") ||
                  projectCat.includes("finance"))) ||
              (categoryId === "payment" &&
                (projectCat.includes("payment") ||
                  projectCat.includes("transaction") ||
                  projectCat.includes("remittance") ||
                  projectCat.includes("cross-border") ||
                  projectCat.includes("cross border")))
          );

          if (categoryMatches) {
            if (project.coin_or_project) {
              categoryCoins.add(project.coin_or_project);

              // Update coin breakdown
              if (!coinData.has(project.coin_or_project)) {
                coinData.set(project.coin_or_project, {
                  rpoints: 0,
                  mentions: 0,
                });
              }

              const coin = coinData.get(project.coin_or_project)!;
              const rpoints = Number(project.rpoints) || 0;
              coin.rpoints += isNaN(rpoints) ? 0 : rpoints;
              coin.mentions += project.total_count || 1;

              // Update totals
              totalRpoints += isNaN(rpoints) ? 0 : rpoints;
              totalMentions += project.total_count || 1;

              if (isRecent) recentActivity += 1;

              // Update market cap distribution
              const marketcap = (project.marketcap || "").toLowerCase();
              if (marketcap === "large") marketCapDistribution.large += 1;
              if (marketcap === "medium") marketCapDistribution.medium += 1;
              if (marketcap === "small") marketCapDistribution.small += 1;
            }
          }
        });
      });

      // Sort coins by rpoints
      const coinBreakdown = Array.from(coinData.entries())
        .map(([name, data]) => ({
          name,
          rpoints: Math.round(data.rpoints * 100) / 100,
          mentions: data.mentions,
        }))
        .sort((a, b) => b.rpoints - a.rpoints)
        .slice(0, 20); // Top 20 coins

      // Add payment-related coins for payment category if we don't have enough data
      if (categoryId === "payment" && coinBreakdown.length < 5) {
        // Common payment coins that should be included
        const paymentCoins = [
          "XRP (Ripple)",
          "Stellar (XLM)",
          "Dogecoin (DOGE)",
          "Litecoin (LTC)",
          "Dash",
          "Bitcoin Cash (BCH)",
          "Monero (XMR)",
          "Nano",
          "Terra Classic (LUNC)",
          "Celo",
        ];

        // Add any missing payment coins
        paymentCoins.forEach((coinName) => {
          if (!coinData.has(coinName)) {
            // If the coin doesn't exist in our data, add it with a small rpoints value
            const newCoin = {
              name: coinName,
              rpoints: 1, // Small value to ensure they show up but below actual data
              mentions: 1,
            };
            coinBreakdown.push(newCoin);
            categoryCoins.add(coinName);
          }
        });

        // Resort after adding additional coins
        coinBreakdown.sort((a, b) => b.rpoints - a.rpoints);
      }

      const analytics = {
        coins: Array.from(categoryCoins),
        totalRpoints: Math.round(totalRpoints * 100) / 100,
        mentions: totalMentions,
        marketCapDistribution,
        recentActivity,
        coinBreakdown,
      };

      setCategoryAnalytics(analytics);
      setIsLoading(false);
    } else if (!knowledgeLoading) {
      // If knowledge data is loaded but empty
      setIsLoading(false);
    }
  }, [categoryId, categoryData, knowledge, knowledgeLoading]);

  // Fetch category data from CoinGecko API - only once
  useEffect(() => {
    // Skip if no category ID or if we've already fetched
    if (!categoryId || hasFetched) return;

    const fetchCategoryData = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset any previous errors

        // Mark as fetched to prevent loops
        setHasFetched(true);

        // Map our category IDs to CoinGecko's category IDs
        const coingeckoCategoryMapping: Record<string, string> = {
          // Direct mappings to CoinGecko category IDs
          payment: "payment-solutions",
          staking: "staking-pool",
          gaming: "gaming",
          "gaming-entertainment-social": "gaming",
          infrastructure: "infrastructure",
          oracle: "oracle",
          scaling: "scaling",
          "layer-2": "layer-2",
          privacy: "privacy-coins",
          "privacy-coins": "privacy-coins",
          "meme-token": "meme-token",
          nft: "non-fungible-tokens-nft",
          "non-fungible-tokens-nft": "non-fungible-tokens-nft",
          "decentralized-finance-defi": "decentralized-finance-defi",
          "artificial-intelligence-ai": "artificial-intelligence",
          "layer-1": "layer-1",
          "exchange-token": "centralized-exchange-token-cex",
        };

        // Use the mapped category ID if available, otherwise use the original
        const coingeckoCategoryId =
          coingeckoCategoryMapping[categoryId] || categoryId;

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/categories/${coingeckoCategoryId}`,
          {
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (response.status === 404) {
          setError(`Category "${categoryId}" not found on CoinGecko.`);
          return;
        }

        if (response.status === 429) {
          setError(
            "CoinGecko API rate limit reached. Please try again in a few minutes."
          );
          return;
        }

        if (response.status === 503) {
          setError(
            "CoinGecko API is currently unavailable. Please try again later."
          );
          return;
        }

        if (!response.ok) {
          setError(
            `Failed to load category data (${response.status}). Please try again later.`
          );
          return;
        }

        const data = await response.json();

        // Validate the response data
        if (!data || typeof data !== "object") {
          setError(
            "Invalid response from CoinGecko API. Please try again later."
          );
          return;
        }

        // Special handling for payment category if CoinGecko returns empty data
        if (Object.keys(data).length === 0 && categoryId === "payment") {
          // Create synthetic data for payment category if API returns empty
          const syntheticPaymentData = {
            id: "payment-solutions",
            name: "Payment Solutions",
            coins: [
              // Add popular payment coins manually
              { id: "bitcoin", name: "Bitcoin", symbol: "btc" },
              { id: "litecoin", name: "Litecoin", symbol: "ltc" },
              { id: "ripple", name: "XRP", symbol: "xrp" },
              { id: "stellar", name: "Stellar", symbol: "xlm" },
              { id: "nano", name: "Nano", symbol: "xno" },
              { id: "dash", name: "Dash", symbol: "dash" },
            ],
          };

          return syntheticPaymentData;
        }

        setCategoryData(data);
      } catch (error) {
        console.error("Error fetching category data:", error);
        setError(
          "Failed to load category data. Please check your connection and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryData();
  }, [categoryId, hasFetched]);

  // Process analytics when data changes - separate from fetch
  useEffect(() => {
    if (knowledge.length > 0 && !knowledgeLoading && categoryData) {
      processKnowledgeData();
    } else if (!knowledgeLoading && !isLoading) {
      // If we're not loading either dataset, we can stop the loading state
      setIsLoading(false);
    }
  }, [
    knowledge,
    knowledgeLoading,
    categoryData,
    processKnowledgeData,
    isLoading,
  ]);

  if (error) {
    return (
      <div className="min-h-screen pt-24 bg-gradient-to-br from-black via-green-900/20 to-black relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 lg:px-20 py-8">
          <div className="p-6 bg-black/80 backdrop-blur-md border border-red-500/30 rounded-xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-gray-300">{error}</p>
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-4">
                Try one of these popular categories instead:
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/categories/layer-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    Layer 1
                  </Button>
                </Link>
                <Link href="/categories/meme-token">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    Meme Coins
                  </Button>
                </Link>
                <Link href="/categories/gaming">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                  >
                    Gaming
                  </Button>
                </Link>
                <Link href="/categories/artificial-intelligence-ai">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    AI
                  </Button>
                </Link>
              </div>
            </div>
            <Link href="/categories" className="mt-6 inline-block">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Categories
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  // Show a user-friendly message if no data was found for this category
  if (!categoryData) {
    return (
      <div className="min-h-screen pt-24 bg-gradient-to-br from-black via-green-900/20 to-black relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 lg:px-20 py-8">
          <div className="p-6 bg-black/80 backdrop-blur-md border border-yellow-500/30 rounded-xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">
              No Data Found
            </h2>
            <p className="text-gray-300">
              We&apos;re looking for &quot;{categoryId}&quot; but couldn&apos;t
              find it.
            </p>
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-4">
                Try one of these popular categories instead:
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/categories/layer-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    Layer 1
                  </Button>
                </Link>
                <Link href="/categories/meme-token">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    Meme Coins
                  </Button>
                </Link>
                <Link href="/categories/gaming">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                  >
                    Gaming
                  </Button>
                </Link>
                <Link href="/categories/artificial-intelligence-ai">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    AI
                  </Button>
                </Link>
              </div>
            </div>
            <Link href="/categories" className="mt-6 inline-block">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Categories
              </Button>
            </Link>
          </div>

          {/* Show knowledge data if we have it */}
          {categoryAnalytics && categoryAnalytics.coinBreakdown.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                Knowledge Data for {displayName}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <Card className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                  <h3 className="text-lg font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    Top Coins in {displayName}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-300">
                            Coin
                          </th>
                          <th className="text-right py-3 px-4 text-gray-300">
                            rPoints
                          </th>
                          <th className="text-right py-3 px-4 text-gray-300">
                            Mentions
                          </th>
                          <th className="text-right py-3 px-4 text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryAnalytics.coinBreakdown.map((coin) => {
                          return (
                            <tr
                              key={coin.name}
                              className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                              onClick={() => {
                                const cleanName = coin.name
                                  .toLowerCase()
                                  .trim();
                                const safeId = cleanName
                                  .replace(/[^\w\s-]/g, "")
                                  .replace(/\s+/g, "-");
                                router.push(`/coin/${safeId}`);
                              }}
                            >
                              <td className="py-3 px-4 font-medium text-gray-100">
                                {coin.name}
                              </td>
                              <td className="py-3 px-4 text-right text-blue-300">
                                {coin.rpoints}
                              </td>
                              <td className="py-3 px-4 text-right text-purple-300">
                                {coin.mentions.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Link
                                  href={`/coin/${coin.name
                                    .toLowerCase()
                                    .replace(/[^\w\s-]/g, "")
                                    .replace(/\s+/g, "-")}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-300 hover:text-white hover:bg-gray-700/50"
                                  >
                                    View{" "}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-black via-green-900/20 to-black relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-green-500/20 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-teal-500/20 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-20 py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-8">
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
                <BreadcrumbLink href="/categories">Categories</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{displayName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
            onClick={() => router.push(backButtonInfo.href)}
          >
            <ArrowLeft className="w-4 h-4" />
            {backButtonInfo.text}
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500">
            {displayName}
          </h1>
          {categoryData && (
            <p className="text-gray-400 mt-1">
              Market Cap: ${formatNumber(categoryData?.market_cap)} • 24h
              Volume: ${formatNumber(categoryData?.volume_24h)}
            </p>
          )}
        </div>

        {/* Description */}
        {categoryData?.content && (
          <div className="mb-8">
            <p className="text-gray-300 max-w-3xl text-lg leading-relaxed ">
              {categoryData.content}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total rPoints"
            value={categoryAnalytics?.totalRpoints || 0}
            icon={<TrendingUp className="h-5 w-5 text-green-400" />}
            color="green"
          />
          <MetricCard
            title="Total Mentions"
            value={categoryAnalytics?.mentions || 0}
            icon={<Users className="h-5 w-5 text-emerald-400" />}
            color="emerald"
          />
          <MetricCard
            title="Unique Coins"
            value={categoryAnalytics?.coins.length || 0}
            icon={<Hash className="h-5 w-5 text-teal-400" />}
            color="teal"
          />
          <MetricCard
            title="Recent Activity"
            value={categoryAnalytics?.recentActivity || 0}
            suffix="in 7d"
            icon={<Activity className="h-5 w-5 text-cyan-400" />}
            color="cyan"
          />
        </div>

        {/* Analytics Section */}
        <div className="space-y-8">
          {/* CoinGecko Data */}
          {categoryData && (
            <Card className="p-6 bg-black/80 backdrop-blur-sm ring-2 ring-cyan-500/20 hover:ring-cyan-500/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                CoinGecko Category Data
              </h3>

              {/* Market Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-black/60 rounded-lg p-4 ring-2 ring-cyan-500/20">
                  <h4 className="text-sm text-gray-400 mb-1">Market Cap</h4>
                  <p className="text-xl font-medium text-cyan-300">
                    ${formatNumber(categoryData?.market_cap)}
                  </p>
                  <p
                    className={`text-sm ${
                      (categoryData?.market_cap_change_24h ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {(categoryData?.market_cap_change_24h ?? 0) >= 0 ? "+" : ""}
                    {(categoryData?.market_cap_change_24h ?? 0).toFixed(2)}% 24h
                  </p>
                </div>
                <div className="bg-black/60 rounded-lg p-4 ring-2 ring-cyan-500/20">
                  <h4 className="text-sm text-gray-400 mb-1">24h Volume</h4>
                  <p className="text-xl font-medium text-teal-300">
                    ${formatNumber(categoryData?.volume_24h)}
                  </p>
                </div>
                <div className="bg-black/60 rounded-lg p-4 ring-2 ring-cyan-500/20">
                  <h4 className="text-sm text-gray-400 mb-1">Last Updated</h4>
                  <p className="text-xl font-medium text-emerald-300">
                    {new Date(
                      categoryData?.updated_at ?? ""
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Top 3 Coins */}
              {categoryData?.top_3_coins &&
                categoryData.top_3_coins.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm text-gray-400 mb-4">Top 3 Coins</h4>
                    <div className="flex flex-wrap gap-4">
                      {categoryData.top_3_coins.map((coinImageUrl, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-black/60 p-3 rounded-lg ring-2 ring-cyan-500/20"
                        >
                          <Image
                            src={coinImageUrl}
                            alt={`${categoryData.top_3_coins_id[index]} coin`}
                            width={48}
                            height={48}
                            className="rounded-full"
                            style={{ height: "auto" }}
                          />
                          <span className="ml-3 text-gray-300 capitalize">
                            {categoryData.top_3_coins_id[index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </Card>
          )}

          {/* Market Cap Distribution and Top Coins by rPoints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Market Cap Distribution */}
            <Card className="p-6 bg-black/80 backdrop-blur-sm ring-2 ring-green-500/20 hover:ring-green-500/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                Market Cap Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Large Cap",
                          value:
                            categoryAnalytics?.marketCapDistribution.large || 0,
                        },
                        {
                          name: "Medium Cap",
                          value:
                            categoryAnalytics?.marketCapDistribution.medium ||
                            0,
                        },
                        {
                          name: "Small Cap",
                          value:
                            categoryAnalytics?.marketCapDistribution.small || 0,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        percent > 0.05
                          ? `${name}: ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                    >
                      {["#4ade80", "#10b981", "#059669"].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} coins`, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Coins by rPoints */}
            <Card className="p-6 bg-black/80 backdrop-blur-sm ring-2 ring-emerald-500/20 hover:ring-emerald-500/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">
                Top Coins by rPoints
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryAnalytics?.coinBreakdown.slice(0, 10) || []}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => [`${value} rPoints`, ""]} />
                    <Bar
                      dataKey="rpoints"
                      fill="#4ade80"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Top Coins Table */}
          <Card className="p-6 bg-black/80 backdrop-blur-sm ring-2 ring-teal-500/20 hover:ring-teal-500/30 transition-all duration-300">
            <h3 className="text-lg font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              Top Coins in {categoryData?.name || categoryId}
            </h3>
            {!categoryAnalytics?.coinBreakdown.length ? (
              <p className="text-gray-400 py-4 text-center">
                No coins found for this category in our knowledge data.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-teal-500/20">
                      <th className="text-left py-3 px-4 text-gray-300">
                        Coin
                      </th>
                      <th className="text-right py-3 px-4 text-gray-300">
                        rPoints
                      </th>
                      <th className="text-right py-3 px-4 text-gray-300">
                        Total Mentions
                      </th>
                      <th className="text-right py-3 px-4 text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryAnalytics.coinBreakdown.map((coin) => {
                      return (
                        <tr
                          key={coin.name}
                          className="border-b border-teal-500/10 hover:bg-teal-500/5 cursor-pointer transition-colors"
                          onClick={() => {
                            const cleanName = coin.name.toLowerCase().trim();
                            const safeId = cleanName
                              .replace(/[^\w\s-]/g, "")
                              .replace(/\s+/g, "-");
                            router.push(`/coin/${safeId}`);
                          }}
                        >
                          <td className="py-3 px-4 font-medium text-gray-100">
                            {coin.name}
                          </td>
                          <td className="py-3 px-4 text-right text-teal-300">
                            {coin.rpoints}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-300">
                            {coin.mentions.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/coin/${coin.name
                                .toLowerCase()
                                .replace(/[^\w\s-]/g, "")
                                .replace(/\s+/g, "-")}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-300 hover:text-teal-300 hover:bg-teal-500/10"
                              >
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-black via-green-900/20 to-black relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-20 py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-28 mb-4" />
          <Skeleton className="h-10 w-72 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card
                key={i}
                className="p-4 bg-black/40 backdrop-blur-sm border border-green-500/20"
              >
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </Card>
            ))}
        </div>

        <Skeleton className="h-10 w-full max-w-md mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-black/40 backdrop-blur-sm border border-green-500/20">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-64 w-full rounded-md" />
          </Card>

          <Card className="p-4 bg-black/40 backdrop-blur-sm border border-green-500/20">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-64 w-full rounded-md" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  suffix,
  icon,
  color = "green",
}: {
  title: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
  color?: "green" | "emerald" | "teal" | "cyan";
}) {
  const colorClasses = {
    green: "ring-green-500/20 hover:ring-green-500/30",
    emerald: "ring-emerald-500/20 hover:ring-emerald-500/30",
    teal: "ring-teal-500/20 hover:ring-teal-500/30",
    cyan: "ring-cyan-500/20 hover:ring-cyan-500/30",
  };

  return (
    <Card
      className={`p-4 flex flex-col bg-black/80 backdrop-blur-sm ring-2 ${colorClasses[color]} transition-all duration-300`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-200">{title}</h3>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-1 text-white">
        {formatNumber(value)}{" "}
        {suffix && (
          <span className="text-sm font-normal text-gray-300">{suffix}</span>
        )}
      </p>
    </Card>
  );
}

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + "K";
  }
  return num.toString();
}

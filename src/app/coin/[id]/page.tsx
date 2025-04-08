"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Coins,
  CoinsIcon,
  Volume2,
  Home,
  ThumbsUp,
  ThumbsDown,
  Tag,
  CircleDollarSign,
} from "lucide-react";
import Image from "next/image";
import CoinChart from "./CoinChart";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ChannelMentionsTable from "./ChannelMentionsTable";
import Link from "next/link";

async function getCoinData(id: string | undefined) {
  if (!id) throw new Error("No coin ID provided");

  try {
    const response = await fetch(`/api/coins/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch coin data: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching coin data:", error);
    throw error;
  }
}

// Add market cap size classification function here
function getMarketCapSize(marketCap: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (marketCap >= 10_000_000_000) {
    // $10B+
    return {
      label: "Large Cap",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    };
  } else if (marketCap >= 1_000_000_000) {
    // $1B+
    return {
      label: "Mid Cap",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    };
  } else if (marketCap >= 100_000_000) {
    // $100M+
    return {
      label: "Small Cap",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
    };
  } else {
    return {
      label: "Micro Cap",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    };
  }
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

export default function CoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { data, isError, isLoading } = useQuery({
    queryKey: ["coin", resolvedParams.id],
    queryFn: () => getCoinData(resolvedParams.id),
    staleTime: resolvedParams.id.startsWith("cmc-")
      ? 15 * 60 * 1000
      : 60 * 1000, // 15 min for CMC, 1 min for CoinGecko
    retry: 2,
    enabled: !!resolvedParams.id,
  });

  if (isLoading) {
    return (
      <main className="container mx-auto p-4 mt-24 space-y-6">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (isError || !data || !data.market_data) {
    return (
      <main className="container mx-auto p-4 mt-24 space-y-6">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-red-500">Failed to load coin data</div>
        </div>
      </main>
    );
  }

  const displayData = {
    name: data.name || "",
    symbol: data.symbol || "",
    image: data.image?.large || "",
    price: data.market_data?.current_price?.usd || 0,
    market_cap: data.market_data?.market_cap?.usd || 0,
    percent_change_24h: data.market_data?.price_change_percentage_24h || 0,
    percent_change_7d: data.market_data?.price_change_percentage_7d || 0,
    percent_change_30d: data.market_data?.price_change_percentage_30d || 0,
    volume_24h: data.market_data?.total_volume?.usd || 0,
    circulating_supply: data.market_data?.circulating_supply || 0,
    coingecko_id: data.id || resolvedParams.id,
    cmc_id: data.cmc_id,
    data_source: data.data_source || "coingecko",
    sentiment_votes_up_percentage: data.sentiment_votes_up_percentage || 0,
    sentiment_votes_down_percentage: data.sentiment_votes_down_percentage || 0,
    categories: data.categories || [],
    description: data.description?.en || "",
  };

  // Get market cap classification
  const marketCapSize = getMarketCapSize(displayData.market_cap);

  return (
    <main className="min-h-screen pt-24 bg-gradient-to-br from-black via-blue-900/20 to-black relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="container mx-auto px-4 sm:px-10 lg:px-20 py-8 relative z-10">
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
                <BreadcrumbPage>{displayData.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            onClick={() => router.push("/analytics")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analytics
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              {displayData.image ? (
                <Image
                  src={displayData.image}
                  alt={`${displayData.name} logo`}
                  fill
                  className="rounded-full object-cover ring-2 ring-blue-500/20"
                  sizes="64px"
                  priority
                />
              ) : (
                <CoinsIcon
                  className="w-16 h-16 text-blue-400"
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                {displayData.name} ({displayData.symbol.toUpperCase()})
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <span className="text-sm text-gray-400">
                  Source:{" "}
                  {displayData.data_source === "cmc"
                    ? "CoinMarketCap"
                    : "CoinGecko"}
                </span>
              </div>
            </div>
          </div>

          {displayData.description && (
            <div className="mt-6">
              <div className="relative">
                <div
                  className="prose prose-sm prose-invert max-w-none line-clamp-3 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: displayData.description }}
                  id="description-content"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
                  id="fade-overlay"
                />
              </div>
              <button
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                id="description-toggle"
                onClick={() => {
                  const content = document.getElementById(
                    "description-content"
                  );
                  const overlay = document.getElementById("fade-overlay");
                  const toggleBtn =
                    document.getElementById("description-toggle");

                  if (content && overlay && toggleBtn) {
                    const isExpanded =
                      content.classList.contains("line-clamp-none");

                    // Toggle classes
                    content.classList.toggle("line-clamp-3", isExpanded);
                    content.classList.toggle("line-clamp-none", !isExpanded);

                    // Toggle overlay visibility
                    overlay.style.display = isExpanded ? "block" : "none";

                    // Update button text
                    toggleBtn.textContent = isExpanded
                      ? "See more"
                      : "See less";
                  }
                }}
              >
                See more
              </button>
            </div>
          )}
        </div>

        {displayData.categories && displayData.categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
              Categories
            </h2>
            <div className="flex flex-wrap gap-3">
              {displayData.categories.map((category: string, index: number) => (
                <Link
                  href={`/categories/${category
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  key={index}
                >
                  <div className="bg-black/40 backdrop-blur-sm border border-blue-500/20 hover:bg-blue-500/10 transition-colors px-3 py-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300">{category}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black/40 backdrop-blur-sm border-blue-500/20 hover:bg-black/60 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-200">
                {formatPriceDisplay(displayData.price)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-purple-500/20 hover:bg-black/60 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-200">
                ${formatNumber(displayData.market_cap)}
              </div>
              <div className="mt-1 flex items-center">
                <div
                  className={`text-xs px-2 py-1 rounded-full ${marketCapSize.bgColor} ${marketCapSize.color} border ${marketCapSize.borderColor} flex items-center gap-1`}
                >
                  <CircleDollarSign className="w-3 h-3" />
                  {marketCapSize.label}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-green-500/20 hover:bg-black/60 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-400" />
                Volume (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-200">
                ${formatNumber(displayData.volume_24h)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-pink-500/20 hover:bg-black/60 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Coins className="w-4 h-4 text-pink-400" />
                Circulating Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-200">
                {formatNumber(displayData.circulating_supply)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-black/40 backdrop-blur-sm border-purple-500/20 hover:bg-black/60 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Price Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="24h" className="w-full">
                <div className="flex justify-end mb-2">
                  <TabsList className="bg-gray-900/60 h-7">
                    <TabsTrigger value="24h" className="text-xs px-2.5 h-6">
                      24h
                    </TabsTrigger>
                    <TabsTrigger value="7d" className="text-xs px-2.5 h-6">
                      7d
                    </TabsTrigger>
                    <TabsTrigger value="30d" className="text-xs px-2.5 h-6">
                      30d
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="24h" className="mt-0">
                  <div
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      displayData.percent_change_24h >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {displayData.percent_change_24h >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {displayData.percent_change_24h.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </div>
                </TabsContent>
                <TabsContent value="7d" className="mt-0">
                  <div
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      displayData.percent_change_7d >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {displayData.percent_change_7d >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {displayData.percent_change_7d.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </div>
                </TabsContent>
                <TabsContent value="30d" className="mt-0">
                  <div
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      displayData.percent_change_30d >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {displayData.percent_change_30d >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {displayData.percent_change_30d?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || 0}
                    %
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-blue-500/20 hover:bg-black/60 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-blue-400" />
                Community Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4 text-green-400" />
                    <span className="text-2xl font-bold text-green-400">
                      {displayData.sentiment_votes_up_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Bullish</span>
                </div>

                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-red-500"
                    style={{
                      width: `${displayData.sentiment_votes_up_percentage}%`,
                    }}
                  />
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <ThumbsDown className="w-4 h-4 text-red-400" />
                    <span className="text-2xl font-bold text-red-400">
                      {displayData.sentiment_votes_down_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Bearish</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black/40 backdrop-blur-sm border-blue-500/20 hover:bg-black/60 transition-all duration-300 mb-8">
          <CardHeader>
            <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Price Chart
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="h-[400px] w-full">
              <CoinChart
                coingecko_id={displayData.coingecko_id}
                data_source={displayData.data_source}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border-purple-500/20 hover:bg-black/60 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Mentions in Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelMentionsTable coinId={displayData.coingecko_id} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + "K";
  }
  return num.toLocaleString();
}

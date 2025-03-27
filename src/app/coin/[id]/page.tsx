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

async function getCoinData(id: string | undefined) {
  if (!id) throw new Error("No coin ID provided");

  try {
    // Check if it's a CMC ID (format: cmc-123)
    const isCMC = id.startsWith("cmc-");
    const cleanId = isCMC ? id.replace("cmc-", "") : id;

    const url = `/api/coins/${cleanId}${isCMC ? "?source=cmc" : ""}`;

    const res = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch coin: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    throw error;
  }
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
  };

  return (
    <main className="container mx-auto p-4 mt-24 space-y-6 px-4 sm:px-10 lg:px-20">
      <div className="flex items-center justify-between">
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
          className="gap-2"
          onClick={() => router.push("/analytics")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Analytics
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12">
          {displayData.image ? (
            <Image
              src={displayData.image}
              alt={`${displayData.name} logo`}
              fill
              className="rounded-full object-cover"
              sizes="48px"
              priority
            />
          ) : (
            <CoinsIcon className="w-12 h-12 text-blue-400" aria-hidden="true" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            {displayData.name} ({displayData.symbol.toUpperCase()})
          </h1>
          <span className="text-sm text-gray-400">
            Source:{" "}
            {displayData.data_source === "cmc" ? "CoinMarketCap" : "CoinGecko"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-200">
              $
              {displayData.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Market Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-200">
              ${displayData.market_cap.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-400" />
              Volume (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-200">
              ${displayData.volume_24h.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
          <CardHeader className="pb-2 flex items-start justify-between">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-400" />
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
                  {displayData.percent_change_30d.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Coins className="w-4 h-4 text-pink-400" />
              Circulating Supply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-200">
              {displayData.circulating_supply.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChannelMentionsTable coinId={displayData.coingecko_id} />

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-gray-200">Price Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <CoinChart coingecko_id={displayData.coingecko_id} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

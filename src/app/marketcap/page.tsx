"use client";

import { useState, Suspense } from "react";
import { CombinedMarketTable } from "@/components/tables/CombinedMarketTable";
import { BarChart3, TrendingUp, Zap } from "lucide-react";

// Create a separate client component that uses useSearchParams
const MarketCapContent = () => {
  // Generate more mock data for pagination
  const generateMockCoinData = (count: number) => {
    const coins = [
      {
        coin: "Bitcoin ($BTC)",
        categories: ["Cryptocurrency"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 100,
        total_count: 500,
      },
      {
        coin: "Ethereum ($ETH)",
        categories: ["Smart Contracts"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 80,
        total_count: 300,
      },
      {
        coin: "Solana ($SOL)",
        categories: ["Layer 1"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 60,
        total_count: 200,
      },
      {
        coin: "BNB ($BNB)",
        categories: ["Exchange Token"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 50,
        total_count: 150,
      },
      {
        coin: "XRP ($XRP)",
        categories: ["Payment"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 40,
        total_count: 120,
      },
      {
        coin: "Cardano ($ADA)",
        categories: ["Smart Contracts"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 35,
        total_count: 110,
      },
      {
        coin: "Dogecoin ($DOGE)",
        categories: ["Meme"],
        channel: "twitter",
        date: "2023-05-01",
        rpoints: 30,
        total_count: 100,
      },
    ];

    // Generate more coins
    const result = [];
    for (let i = 0; i < count; i++) {
      const baseCoin = coins[i % coins.length];
      const suffix =
        i > coins.length ? ` Clone ${Math.floor(i / coins.length)}` : "";
      result.push({
        ...baseCoin,
        coin: baseCoin.coin.replace(/\s\(/, `${suffix} (`),
        rpoints: Math.max(5, baseCoin.rpoints - i * 2),
        total_count: Math.max(20, baseCoin.total_count - i * 5),
      });
    }

    return result;
  };

  // Mock processed data that matches what's needed by the CombinedMarketTable
  const [mockProcessedData] = useState({
    projectDistribution: [
      { name: "Bitcoin", value: 100 },
      { name: "Ethereum", value: 80 },
      { name: "Solana", value: 40 },
    ],
    projectTrends: new Map([
      [
        "bitcoin",
        [
          { date: "2023-01-01", rpoints: 100 },
          { date: "2023-01-02", rpoints: 110 },
        ],
      ],
      [
        "ethereum",
        [
          { date: "2023-01-01", rpoints: 80 },
          { date: "2023-01-02", rpoints: 85 },
        ],
      ],
    ]),
    categoryDistribution: [
      { name: "Defi", value: 30 },
      { name: "Gaming", value: 20 },
    ],
    coinCategories: generateMockCoinData(150), // Generate 150 mock coins
    channels: ["twitter", "discord", "telegram"],
  });

  // We're only using the initial value, so we don't need the setter
  const [selectedChannels] = useState<string[]>(["twitter"]);

  // Use a more generic type to avoid compatibility issues
  const handleCoinSelect = (coin: {
    symbol: string;
    coingecko_id: string;
    data: unknown;
  }) => {
    console.log("Selected coin:", coin);
  };

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
      <div className="container mx-auto px-4 2xl:px-0 max-w-[1400px] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-100">
                Today&apos;s Cryptocurrency Prices
              </h1>
              <p className="text-sm text-gray-400">
                The global crypto market cap is $2.43T, a 2.95% increase over
                the last day.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Live Data
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">
                AI-Powered
              </span>
            </div>
          </div>
        </div>

        {/* MarketCap Table with the new UI and pagination */}
        <CombinedMarketTable
          processedData={mockProcessedData}
          selectedChannels={selectedChannels}
          onCoinSelect={handleCoinSelect}
        />
      </div>
    </div>
  );
};

export default function MarketCapPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 px-4 text-center">Loading market data...</div>
      }
    >
      <MarketCapContent />
    </Suspense>
  );
}

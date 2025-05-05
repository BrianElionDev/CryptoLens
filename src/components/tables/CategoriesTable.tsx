import React, { useState } from "react";
import type { ProcessedData } from "./CombinedMarketTable";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface CategoriesTableProps {
  processedData: ProcessedData;
  onCategorySelect: (category: string) => void;
}

export function CategoriesTable({
  processedData,
  onCategorySelect,
}: CategoriesTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Define a mapping for display names and category IDs
  const categoryDisplayNames: Record<string, string> = {
    "meme-token": "Meme Coins",
    "decentralized-finance-defi": "DeFi",
    "artificial-intelligence": "AI & Machine Learning",
    "layer-1": "Layer 1",
    gaming: "Gaming & Entertainment",
    "gaming-entertainment-social": "Gaming & Entertainment",
    "centralized-exchange-token-cex": "Exchange Tokens",
    "payment-solutions": "Payment Solutions",
    "privacy-coins": "Privacy Coins",
    infrastructure: "Infrastructure",
    oracle: "Oracles",
    "non-fungible-tokens-nft": "NFTs & Collectibles",
    "staking-pool": "Staking & Yield",
    "layer-2": "Layer 2 & Scaling",
    "utility-token": "Utility Tokens",
  };

  // Normalize category name to match CoinGecko IDs
  const normalizeCategory = (
    category: string
  ): { id: string; displayName: string } => {
    const normalized = category.toLowerCase().trim();

    // Direct mappings to CoinGecko category IDs
    const coingeckoCategoryMapping: Record<string, string> = {
      // Payment
      payment: "payment-solutions",
      payments: "payment-solutions",
      "payment solutions": "payment-solutions",
      "payment solution": "payment-solutions",
      "payment protocol": "payment-solutions",
      transaction: "payment-solutions",
      remittance: "payment-solutions",
      "cross-border": "payment-solutions",
      "cross border": "payment-solutions",

      // Staking
      staking: "staking-pool",
      stake: "staking-pool",
      "staking pool": "staking-pool",
      pos: "staking-pool",

      // Gaming
      gaming: "gaming",
      game: "gaming",
      games: "gaming",
      "gaming-entertainment-social": "gaming",
      "play to earn": "gaming",
      p2e: "gaming",

      // Infrastructure
      infrastructure: "infrastructure",
      infra: "infrastructure",
      "blockchain infrastructure": "infrastructure",

      // Oracle
      oracle: "oracle",
      oracles: "oracle",
      "data oracle": "oracle",
      "price oracle": "oracle",

      // Privacy
      privacy: "privacy-coins",
      "privacy coins": "privacy-coins",
      "privacy coin": "privacy-coins",
      private: "privacy-coins",

      // NFT
      nft: "non-fungible-tokens-nft",
      nfts: "non-fungible-tokens-nft",
      "non-fungible token": "non-fungible-tokens-nft",
      "non fungible token": "non-fungible-tokens-nft",
      collectible: "non-fungible-tokens-nft",
      collectibles: "non-fungible-tokens-nft",

      // Layer 2
      scaling: "layer-2",
      "layer 2": "layer-2",
      "layer-2": "layer-2",
      l2: "layer-2",
      rollup: "layer-2",
      rollups: "layer-2",

      // Layer 1
      "layer 1": "layer-1",
      "layer-1": "layer-1",
      l1: "layer-1",

      // Exchange tokens
      "exchange token": "centralized-exchange-token-cex",
      "exchange tokens": "centralized-exchange-token-cex",
      exchange: "centralized-exchange-token-cex",

      // Meme tokens
      meme: "meme-token",
      "meme coin": "meme-token",
      "meme coins": "meme-token",
      memes: "meme-token",
      memecoin: "meme-token",

      // DeFi
      defi: "decentralized-finance-defi",
      "decentralized finance": "decentralized-finance-defi",

      // AI
      ai: "artificial-intelligence",
      "artificial intelligence": "artificial-intelligence",
      "ai & big data": "artificial-intelligence",
      "ai & ml": "artificial-intelligence",
      "ai & machine learning": "artificial-intelligence",

      // Utility
      utility: "utility-token",
      "utility token": "utility-token",
      "utility tokens": "utility-token",
      "platform token": "utility-token",
    };

    // Get the normalized ID
    let id: string;
    if (coingeckoCategoryMapping[normalized]) {
      id = coingeckoCategoryMapping[normalized];
    } else {
      // Default case - convert to kebab-case
      id = normalized
        .replace(/&/g, "and")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }

    // Get display name (either from mapping or capitalized original)
    const displayName =
      categoryDisplayNames[id] ||
      category
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    return { id, displayName };
  };

  // Process categories to get unique normalized categories with counts
  const normalizedCategories = React.useMemo(() => {
    const categoryMap = new Map<
      string,
      { displayName: string; count: number }
    >();

    // Get all unique raw categories
    const rawCategories = new Set<string>();
    processedData.coinCategories.forEach((coinData) => {
      coinData.categories.forEach((category) => {
        if (category.trim()) {
          rawCategories.add(category.trim());
        }
      });
    });

    // Normalize categories and create ID -> displayName mapping
    Array.from(rawCategories).forEach((category) => {
      const { id, displayName } = normalizeCategory(category);
      if (!categoryMap.has(id)) {
        categoryMap.set(id, { displayName, count: 0 });
      }
    });

    // Count unique coins per category
    processedData.coinCategories.forEach((coinData) => {
      // Get normalized category IDs for this coin
      const categoryIds = new Set<string>();
      coinData.categories.forEach((category) => {
        if (category.trim()) {
          const { id } = normalizeCategory(category);
          categoryIds.add(id);
        }
      });

      // For each unique category, increment the count
      categoryIds.forEach((id) => {
        if (categoryMap.has(id)) {
          categoryMap.get(id)!.count++;
        }
      });
    });

    return Array.from(categoryMap.entries())
      .map(([id, { displayName, count }]) => ({ id, displayName, count }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedData.coinCategories]);

  // Handle navigation to category detail page
  const navigateToCategoryPage = (categoryId: string) => {
    console.log(`Navigating to category: ${categoryId}`);
    router.push(`/categories/${categoryId}`);

    // For backward compatibility
    if (onCategorySelect) {
      const categoryInfo = normalizedCategories.find(
        (c) => c.id === categoryId
      );
      if (categoryInfo) {
        onCategorySelect(categoryInfo.displayName);
      }
    }
  };

  // Filter categories based on search term
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return normalizedCategories;

    return normalizedCategories.filter((category) =>
      category.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [normalizedCategories, searchTerm]);

  // Clear search handler
  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl border border-gray-800/20">
      <div className="p-4">
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold text-white">Categories</h2>

          {/* Search bar */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="block w-full bg-gray-800/40 border border-gray-700 rounded-md py-2 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              No categories found matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {filteredCategories.map((category, index) => {
                // Determine color accent based on index
                const colorAccents = [
                  {
                    border: "border-blue-500/30",
                    bg: "bg-blue-500/10",
                    text: "text-blue-300",
                    buttonBg: "bg-blue-500/10",
                    buttonText: "text-blue-300",
                    buttonBorder: "border-blue-500/30",
                    hover: "hover:bg-blue-500/20",
                  },
                  {
                    border: "border-cyan-500/30",
                    bg: "bg-cyan-500/10",
                    text: "text-cyan-300",
                    buttonBg: "bg-cyan-500/10",
                    buttonText: "text-cyan-300",
                    buttonBorder: "border-cyan-500/30",
                    hover: "hover:bg-cyan-500/20",
                  },
                  {
                    border: "border-teal-500/30",
                    bg: "bg-teal-500/10",
                    text: "text-teal-300",
                    buttonBg: "bg-teal-500/10",
                    buttonText: "text-teal-300",
                    buttonBorder: "border-teal-500/30",
                    hover: "hover:bg-teal-500/20",
                  },
                  {
                    border: "border-purple-500/30",
                    bg: "bg-purple-500/10",
                    text: "text-purple-300",
                    buttonBg: "bg-purple-500/10",
                    buttonText: "text-purple-300",
                    buttonBorder: "border-purple-500/30",
                    hover: "hover:bg-purple-500/20",
                  },
                ];

                const colorAccent = colorAccents[index % colorAccents.length];

                return (
                  <div
                    key={category.id}
                    className={`bg-black/40 border ${colorAccent.border} rounded-lg p-4 transition-colors`}
                  >
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-white text-lg">
                          {category.displayName}
                        </div>
                        <div
                          className={`${colorAccent.bg} ${colorAccent.text} px-2 py-1 rounded-full text-sm font-medium`}
                        >
                          {category.count} coins
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className={`mt-3 w-full ${colorAccent.buttonBg} ${colorAccent.buttonText} border ${colorAccent.buttonBorder} ${colorAccent.hover}`}
                        onClick={() => navigateToCategoryPage(category.id)}
                      >
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

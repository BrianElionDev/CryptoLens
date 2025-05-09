// Create new file for Categories tab
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CategoriesTabProps {
  processedData: {
    categoryDistribution: { name: string; value: number }[];
    coinCategories: {
      coin: string;
      categories: string[];
      channel: string;
      rpoints: number;
      id?: string;
    }[];
  };
  selectedChannels: string[];
}

// Define category types for stronger typing
type CategoryInput = string | { name: string } | unknown;

export const CategoriesTab = ({
  processedData,
  selectedChannels,
}: CategoriesTabProps) => {
  const router = useRouter();

  const filteredCategories = processedData.categoryDistribution
    .filter((cat) =>
      processedData.coinCategories.some(
        (coin) =>
          selectedChannels.includes(coin.channel) &&
          coin.categories.includes(cat.name)
      )
    )
    .sort((a, b) => b.value - a.value);

  // Normalize category name to match CoinGecko IDs
  const normalizeCategory = (category: CategoryInput): string => {
    // Ensure we're working with a string
    let categoryStr: string;

    if (typeof category !== "string") {
      // If it's an object with a name property, use that
      if (category && typeof category === "object" && "name" in category) {
        categoryStr = String(category.name);
      } else {
        // Otherwise, stringify the object or use a default
        categoryStr = String(category || "unknown");
      }
    } else {
      categoryStr = category;
    }

    const normalized = categoryStr.toLowerCase().trim();

    // Handle specific categories that need exact mapping to CoinGecko
    const exactMappings: Record<string, string> = {
      "ai & big data": "artificial-intelligence",
      "ai & ml": "artificial-intelligence",
      ai: "artificial-intelligence",
      "artificial intelligence": "artificial-intelligence",
      "artificial-intelligence": "artificial-intelligence",
      "ai & machine learning": "artificial-intelligence",
      dex: "decentralized-exchange",
      "decentralized exchange": "decentralized-exchange",
      "decentralized exchanges": "decentralized-exchange",
      dexes: "decentralized-exchange",
    };

    if (exactMappings[normalized]) {
      return exactMappings[normalized];
    }

    // Handle special cases for common categories with variations
    if (
      normalized === "meme" ||
      normalized === "meme coin" ||
      normalized === "meme coins" ||
      normalized === "memes" ||
      normalized === "memecoin"
    ) {
      return "meme-token";
    }

    if (normalized === "defi" || normalized === "decentralized finance") {
      return "decentralized-finance-defi";
    }

    if (
      normalized === "layer 1" ||
      normalized === "l1" ||
      normalized === "layer-1"
    ) {
      return "layer-1";
    }

    if (
      normalized === "gaming" ||
      normalized === "games" ||
      normalized === "game" ||
      normalized === "p2e" ||
      normalized === "play to earn"
    ) {
      return "gaming-entertainment-social";
    }

    if (
      normalized === "exchange token" ||
      normalized === "exchange tokens" ||
      normalized === "exchange"
    ) {
      return "centralized-exchange-token-cex";
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
      return "payment-solutions";
    }

    if (
      normalized === "privacy" ||
      normalized === "privacy coin" ||
      normalized === "privacy coins" ||
      normalized === "private" ||
      normalized === "anonymity"
    ) {
      return "privacy-coins";
    }

    if (
      normalized === "infrastructure" ||
      normalized === "infra" ||
      normalized === "blockchain infrastructure" ||
      normalized === "web3 infrastructure"
    ) {
      return "infrastructure";
    }

    if (
      normalized === "oracle" ||
      normalized === "oracles" ||
      normalized === "data oracle" ||
      normalized === "price oracle" ||
      normalized === "price feed"
    ) {
      return "oracle";
    }

    if (
      normalized === "nft" ||
      normalized === "nfts" ||
      normalized === "non-fungible token" ||
      normalized === "non fungible token" ||
      normalized === "collectible" ||
      normalized === "collectibles"
    ) {
      return "non-fungible-tokens-nft";
    }

    if (
      normalized === "staking" ||
      normalized === "stake" ||
      normalized === "staking platform" ||
      normalized === "staking protocol" ||
      normalized === "validator" ||
      normalized === "pos"
    ) {
      return "staking-pool";
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
      return "layer-2";
    }

    if (
      normalized === "utility" ||
      normalized === "utility token" ||
      normalized === "utility tokens" ||
      normalized === "platform token"
    ) {
      return "utility-token";
    }

    // Default case - convert to kebab-case and replace special characters
    return normalized
      .replace(/&/g, "and")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-"); // Replace multiple hyphens with a single one
  };

  const handleCategoryClick = (category: string) => {
    // Transform the category name into a URL-friendly ID format using normalization
    const categoryId = normalizeCategory(category);

    // Navigate to the categories page with the category ID
    router.push(`/categories/${categoryId}`);
  };

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-cyan-200 mb-6">
            Coin Categories Overview
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                  Category
                </th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                  Coins
                </th>
                <th className="py-4 px-6 text-right text-sm font-medium text-gray-400 bg-gray-900/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category, index) => (
                <tr
                  key={`${category.name}-${index}`}
                  className="border-b border-gray-800 hover:bg-gray-900/40 transition-colors cursor-pointer"
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <td className="py-4 px-6 text-sm text-gray-300">
                    {category.name}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-300">
                    {category.value}
                  </td>
                  <td className="py-4 px-6 text-sm text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/40"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click event
                        handleCategoryClick(category.name);
                      }}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

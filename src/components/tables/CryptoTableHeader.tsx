import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Filter, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useContextKnowledge } from "@/hooks/useContextKnowledge";
import styles from "./cryptoTable.module.css";

export type TabType = "all" | "categories" | string;

export interface CryptoTableHeaderProps {
  onTabChange?: (tab: TabType) => void;
  onOpenFilters?: () => void;
  onToggleColumns?: () => void;
  showCount?: number;
  onShowCountChange?: (count: number) => void;
  onSearch?: (term: string) => void;
  onCategoryFilter?: (category: string | null) => void;
}

export function CryptoTableHeader({
  onTabChange,
  onOpenFilters,
  onToggleColumns,
  showCount = 100,
  onShowCountChange,
  onSearch,
  onCategoryFilter,
}: CryptoTableHeaderProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNoResults, setShowNoResults] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch knowledge data
  const { data: knowledgeData } = useContextKnowledge();
  const [categories, setCategories] = useState<
    { id: TabType; label: string; icon?: React.ReactNode }[]
  >([
    { id: "all", label: "All Crypto" },
    { id: "categories", label: "Categories" },
  ]);

  // Normalize category name to ensure consistent IDs
  const normalizeCategory = (
    category: string
  ): { id: string; displayName: string } => {
    const normalized = category ? category.toLowerCase().trim() : "";

    // Handle specific categories that need exact mapping to CoinGecko
    const exactMappings: Record<string, { id: string; displayName: string }> = {
      "ai & big data": {
        id: "artificial-intelligence",
        displayName: "AI & ML",
      },
      "ai & ml": { id: "artificial-intelligence", displayName: "AI & ML" },
      ai: { id: "artificial-intelligence", displayName: "AI & ML" },
      "artificial intelligence": {
        id: "artificial-intelligence",
        displayName: "AI & ML",
      },
      "artificial-intelligence": {
        id: "artificial-intelligence",
        displayName: "AI & ML",
      },
      "ai & machine learning": {
        id: "artificial-intelligence",
        displayName: "AI & ML",
      },
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
      return { id: "meme-token", displayName: "Meme Coins" };
    }

    if (normalized === "defi" || normalized === "decentralized finance") {
      return { id: "decentralized-finance-defi", displayName: "DeFi" };
    }

    if (
      normalized === "layer 1" ||
      normalized === "l1" ||
      normalized === "layer-1"
    ) {
      return { id: "layer-1", displayName: "Layer 1" };
    }

    if (
      normalized === "gaming" ||
      normalized === "games" ||
      normalized === "game" ||
      normalized === "p2e" ||
      normalized === "play to earn"
    ) {
      return { id: "gaming-entertainment-social", displayName: "Gaming" };
    }

    if (
      normalized === "exchange token" ||
      normalized === "exchange tokens" ||
      normalized === "exchange"
    ) {
      return {
        id: "centralized-exchange-token-cex",
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
      return { id: "payment-solutions", displayName: "Payments" };
    }

    if (
      normalized === "privacy" ||
      normalized === "privacy coin" ||
      normalized === "privacy coins" ||
      normalized === "private" ||
      normalized === "anonymity"
    ) {
      return { id: "privacy-coins", displayName: "Privacy" };
    }

    if (
      normalized === "infrastructure" ||
      normalized === "infra" ||
      normalized === "blockchain infrastructure" ||
      normalized === "web3 infrastructure"
    ) {
      return { id: "infrastructure", displayName: "Infrastructure" };
    }

    if (
      normalized === "oracle" ||
      normalized === "oracles" ||
      normalized === "data oracle" ||
      normalized === "price oracle" ||
      normalized === "price feed"
    ) {
      return { id: "oracle", displayName: "Oracles" };
    }

    if (
      normalized === "nft" ||
      normalized === "nfts" ||
      normalized === "non-fungible token" ||
      normalized === "non fungible token" ||
      normalized === "collectible" ||
      normalized === "collectibles"
    ) {
      return { id: "non-fungible-tokens-nft", displayName: "NFTs" };
    }

    if (
      normalized === "staking" ||
      normalized === "stake" ||
      normalized === "staking platform" ||
      normalized === "staking protocol" ||
      normalized === "validator" ||
      normalized === "pos"
    ) {
      return { id: "staking-pool", displayName: "Staking" };
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
      return { id: "layer-2", displayName: "Layer 2" };
    }

    if (
      normalized === "utility" ||
      normalized === "utility token" ||
      normalized === "utility tokens" ||
      normalized === "platform token"
    ) {
      return { id: "utility-token", displayName: "Utility" };
    }

    // Clean the category ID
    const cleanId = normalized
      .replace(/&/g, "and")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-"); // Replace multiple hyphens with a single one

    // Default case - keep original display name but make ID kebab-case
    return {
      id: cleanId,
      displayName: category.charAt(0).toUpperCase() + category.slice(1),
    };
  };

  // Extract categories from knowledge data
  useEffect(() => {
    if (knowledgeData) {
      // Get all unique categories from projects
      const allCategories = new Map<
        string,
        { count: number; displayName: string }
      >();

      knowledgeData.forEach((item) => {
        if (item.llm_answer && item.llm_answer.projects) {
          item.llm_answer.projects.forEach((project) => {
            if (
              project &&
              project.category &&
              Array.isArray(project.category)
            ) {
              project.category.forEach((cat) => {
                if (cat && typeof cat === "string") {
                  const trimmedCat = cat.trim();
                  if (trimmedCat) {
                    const { id, displayName } = normalizeCategory(trimmedCat);
                    const existing = allCategories.get(id) || {
                      count: 0,
                      displayName,
                    };
                    allCategories.set(id, {
                      count: existing.count + 1,
                      displayName: existing.displayName,
                    });
                  }
                }
              });
            }
          });
        }
      });

      // Sort categories by frequency and get top 8 (plus All and Categories tabs)
      const topCategories = Array.from(allCategories.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([id, { displayName, count }]) => ({
          id,
          label: displayName,
          icon:
            count > 10 ? <span className="text-amber-400">🔥</span> : undefined,
        }));

      setCategories([
        { id: "all", label: "All Crypto" },
        { id: "categories", label: "Categories" },
        ...topCategories,
      ]);
    }
  }, [knowledgeData]);

  // Function to check scroll capability
  const checkScrollability = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 5 // 5px tolerance
      );
    }
  };

  // Initialize scroll check and add resize listener
  useEffect(() => {
    checkScrollability();

    const handleResize = () => {
      checkScrollability();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [categories]);

  // Add scroll event listener
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollability);
      return () => container.removeEventListener("scroll", checkScrollability);
    }
  }, []);

  // Handle scrolling
  const scrollTabs = (direction: "left" | "right") => {
    const container = tabsContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      if (direction === "left") {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    // Clear search when changing tabs
    if (searchTerm) {
      setSearchTerm("");
      if (onSearch) onSearch("");
    }

    if (onTabChange) {
      onTabChange(tab);
    }

    // If "all" tab is selected, clear any category filter
    if (tab === "all") {
      if (onCategoryFilter) {
        onCategoryFilter(null);
      }
    }
    // If "categories" tab is selected, navigate to categories page
    else if (tab === "categories") {
      // Keep existing behavior for the categories tab
      // This would typically involve navigation handled by the parent component
    }
    // For any specific category tab, apply filter instead of navigating
    else if (tab !== "all" && tab !== "categories") {
      // Apply category filter
      if (onCategoryFilter) {
        onCategoryFilter(tab);
      }
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Pass search term to parent component
    if (onSearch) {
      onSearch(value);
    }

    // Only show no results UI when parent component tells us
    // This is just a placeholder until we implement the callback from parent
    setShowNoResults(value.length > 0 && Math.random() > 0.7);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setShowNoResults(false);
    if (onSearch) {
      onSearch("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Category tabs with scroll indicators */}
      <div className="relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center z-10 pointer-events-none">
            <div className="w-full h-full bg-gradient-to-r from-gray-900 to-transparent opacity-80"></div>
            <button
              onClick={() => scrollTabs("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-gray-800/80 hover:bg-gray-700 text-gray-200 rounded-full p-1 shadow-md pointer-events-auto"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          ref={tabsContainerRef}
          className={`flex items-center overflow-x-auto pb-2 ${styles.scrollbarHide}`}
          onScroll={checkScrollability}
        >
          <div className="flex space-x-1 min-w-max">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                className={cn(
                  "px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-1.5",
                  activeTab === category.id
                    ? "bg-blue-500/10 text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/40"
                )}
                onClick={() => handleTabChange(category.id)}
              >
                {category.icon && category.icon}
                <span className="truncate max-w-20 sm:max-w-none">
                  {category.label}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-end z-10 pointer-events-none">
            <div className="w-full h-full bg-gradient-to-l from-gray-900 to-transparent opacity-80"></div>
            <button
              onClick={() => scrollTabs("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-gray-800/80 hover:bg-gray-700 text-gray-200 rounded-full p-1 shadow-md pointer-events-auto"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              className="block w-full bg-gray-800/40 border border-gray-700 rounded-md py-2 pl-10 pr-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search coins..."
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

          {/* No results message */}
          {showNoResults && (
            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg">
              <div className="p-4 text-center text-gray-400 text-sm">
                No coins found matching &quot;{searchTerm}&quot;
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2">
          {/* Mobile: Show icon only, Desktop: Show icon + text */}
          <Button
            variant="outline"
            onClick={onOpenFilters}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white border-gray-700 rounded-md p-4 sm:px-4 sm:py-2 flex items-center gap-1.5"
          >
            <Filter className="h-4 w-4" />
            <span className=" sm:inline">Filters</span>
          </Button>

          <Button
            variant="outline"
            onClick={onToggleColumns}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white border-gray-700 rounded-md p-4 sm:px-4 sm:py-2 flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                fill="currentColor"
                d="M4,3H20A1,1 0 0,1 21,4V5A1,1 0 0,1 20,6H4A1,1 0 0,1 3,5V4A1,1 0 0,1 4,3M9,7H20A1,1 0 0,1 21,8V9A1,1 0 0,1 20,10H9A1,1 0 0,1 8,9V8A1,1 0 0,1 9,7M4,11H20A1,1 0 0,1 21,12V13A1,1 0 0,1 20,14H4A1,1 0 0,1 3,13V12A1,1 0 0,1 4,11M9,15H20A1,1 0 0,1 21,16V17A1,1 0 0,1 20,18H9A1,1 0 0,1 8,17V16A1,1 0 0,1 9,15Z"
              />
            </svg>
            <span className=" sm:inline">Columns</span>
          </Button>

          <select
            value={showCount}
            onChange={(e) => onShowCountChange?.(Number(e.target.value))}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700 rounded-md px-4 sm:px-4 py-2 text-xs sm:text-sm appearance-none cursor-pointer min-w-16 sm:min-w-max"
          >
            <option value={50}>50 per page </option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
            <option value={500}>500 per page</option>
          </select>
        </div>
      </div>
    </div>
  );
}

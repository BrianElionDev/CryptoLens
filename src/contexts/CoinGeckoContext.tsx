"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import type { Project } from "@/types/knowledge";
import { useCMC } from "./CMCContext";

interface CoinGeckoData {
  id: string;
  symbol: string;
  name: string;
  price?: number;
  market_cap?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d?: number;
  price_change_percentage_1h?: number;
  market_cap_rank?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  market_cap_change_percentage_24h?: number;
  fully_diluted_valuation?: number;
  image?: string;
}

interface CoinGeckoContextType {
  topCoins: CoinGeckoData[];
  isLoading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
  matchCoins: (projects: Project[]) => Project[];
}

const CoinGeckoContext = createContext<CoinGeckoContextType | undefined>(
  undefined
);

export function CoinGeckoProvider({ children }: { children: React.ReactNode }) {
  const [topCoins, setTopCoins] = useState<CoinGeckoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const { topCoins: cmcCoins } = useCMC();
  const matchCache = useRef<
    Map<string, { matched: boolean; data?: CoinGeckoData }>
  >(new Map());

  // Move arrays into useMemo
  const excludeTerms = useMemo(
    () => [
      "bull",
      "bear",
      "best",
      "wallet",
      "market",
      "trading",
      "exchange",
      "crypto",
      "token",
      "nft",
      "defi",
      "blockchain",
      "mining",
      "staking",
      "price",
      "news",
      "update",
      "analysis",
      "prediction",
      "buy",
      "sell",
      "trade",
      "chart",
      "technical",
      "fundamental",
      "strategy",
      "guide",
      "tutorial",
      "review",
      "vs",
      "versus",
      "compared",
      "comparison",
    ],
    []
  );

  const cleanTerms = useMemo(
    () => [
      "coin",
      "protocol",
      "network",
      "chain",
      "finance",
      "ecosystem",
      "platform",
      "project",
      "token",
      "crypto",
    ],
    []
  );

  const matchCoins = useCallback(
    (projects: Project[]) => {
      if (!topCoins.length) return projects;

      return projects.map((project) => {
        const projectName = project.coin_or_project?.toLowerCase().trim() || "";
        if (!projectName) return { ...project, coingecko_matched: false };

        // Check cache first
        const cached = matchCache.current.get(projectName);
        if (cached) {
          return {
            ...project,
            coingecko_matched: cached.matched,
            coingecko_data: cached.data,
          };
        }

        // Skip if the project name contains excluded terms
        if (excludeTerms.some((term) => projectName.includes(term))) {
          matchCache.current.set(projectName, { matched: false });
          return { ...project, coingecko_matched: false };
        }

        // Extract potential ticker if it exists ($XXX)
        const tickerMatch = projectName.match(/\$([a-zA-Z0-9]+)/);
        const ticker = tickerMatch ? tickerMatch[1].toLowerCase() : "";

        // Remove ticker symbols and clean name
        let cleanedName = project.coin_or_project
          .replace(/\s*\(\$[^)]+\)/g, "")
          .replace(/\$[a-zA-Z0-9]+/, "")
          .toLowerCase()
          .trim();

        // Remove common prefixes/suffixes
        cleanTerms.forEach((term) => {
          cleanedName = cleanedName
            .replace(new RegExp(`^${term}\\s+`, "i"), "")
            .replace(new RegExp(`\\s+${term}$`, "i"), "")
            .trim();
        });

        // Skip if cleaned name is too short or contains numbers
        if (cleanedName.length < 2 || /\d/.test(cleanedName)) {
          matchCache.current.set(projectName, { matched: false });
          return { ...project, coingecko_matched: false };
        }

        // Try to find matching coin
        const matchedCoin = topCoins.find((coin) => {
          const symbol = coin.symbol.toLowerCase().trim();
          const name = coin.name.toLowerCase().trim();

          // First try exact matches
          if (ticker && symbol === ticker) return true;
          if (name === cleanedName) return true;
          if (symbol === cleanedName) return true;

          // Then try partial matches, but be very strict
          return (
            (name.includes(cleanedName) && cleanedName.length > 3) ||
            (cleanedName.includes(name) && name.length > 3)
          );
        });

        // Cache and return result
        if (matchedCoin) {
          matchCache.current.set(projectName, {
            matched: true,
            data: matchedCoin,
          });
          return {
            ...project,
            coingecko_matched: true,
            coingecko_data: matchedCoin,
          };
        }

        matchCache.current.set(projectName, { matched: false });
        return { ...project, coingecko_matched: false };
      });
    },
    [topCoins, excludeTerms, cleanTerms]
  );

  const fetchTopCoins = useCallback(async () => {
    try {
      // Only fetch if it's been more than 5 minutes since last fetch
      if (Date.now() - lastFetchTime < 5 * 60 * 1000) {
        console.debug("Using cached coin data", {
          cachedCoins: topCoins.length,
          lastFetchAge: (Date.now() - lastFetchTime) / 1000,
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      console.debug("Fetching fresh coin data from CoinGecko...");

      // Fetch all coins in one request
      const response = await axios.get(`/api/coins/markets`, {
        headers: {
          "Cache-Control": "max-age=300", // Cache for 5 minutes
        },
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response from API");
      }

      const allCoins = response.data.map((coin: CoinGeckoData) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
      }));

      // Merge with CMC data if available
      if (cmcCoins.length > 0) {
        const cmcMap = new Map(
          cmcCoins.map((coin) => [coin.symbol.toLowerCase(), coin])
        );

        allCoins.forEach((coin) => {
          const cmcCoin = cmcMap.get(coin.symbol.toLowerCase());
          if (cmcCoin) {
            // Update coin data with CMC data
            Object.assign(coin, {
              price: cmcCoin.price,
              market_cap: cmcCoin.market_cap,
              total_volume: cmcCoin.volume_24h,
              price_change_percentage_24h: cmcCoin.percent_change_24h,
              price_change_percentage_7d: cmcCoin.percent_change_7d,
              price_change_percentage_1h: cmcCoin.percent_change_1h,
              market_cap_rank: cmcCoin.rank,
              circulating_supply: cmcCoin.circulating_supply,
              total_supply: cmcCoin.total_supply,
              max_supply: cmcCoin.max_supply,
              market_cap_change_percentage_24h: cmcCoin.market_cap_dominance,
              fully_diluted_valuation: cmcCoin.fully_diluted_market_cap,
              image: cmcCoin.image || coin.image,
            });
          }
        });
      }

      console.debug("Successfully fetched coin data:", {
        coinsReceived: allCoins.length,
        firstCoin: allCoins[0]?.name,
        lastCoin: allCoins[allCoins.length - 1]?.name,
        sampleSymbols: allCoins.slice(0, 5).map((c) => c.symbol),
      });

      setTopCoins(allCoins);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("Failed to fetch top coins:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch coin data from CoinGecko";
      setError(new Error(errorMessage));

      // Show error toast only if it's not a rate limit error
      if (
        !(err instanceof Error && err.message.includes("429")) &&
        topCoins.length === 0
      ) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [topCoins.length, lastFetchTime, cmcCoins]);

  // Initial fetch
  useEffect(() => {
    void fetchTopCoins();
  }, [fetchTopCoins]);

  // Refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchTopCoins();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchTopCoins]);

  const value = {
    topCoins,
    isLoading,
    error,
    refreshData: fetchTopCoins,
    matchCoins,
  };

  return (
    <CoinGeckoContext.Provider value={value}>
      {children}
    </CoinGeckoContext.Provider>
  );
}
export function useCoinGecko() {
  const context = useContext(CoinGeckoContext);
  if (context === undefined) {
    throw new Error("useCoinGecko must be used within a CoinGeckoProvider");
  }
  return context;
}

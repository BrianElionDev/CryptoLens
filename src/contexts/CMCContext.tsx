"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { Project } from "@/types/knowledge";

interface CMCContextType {
  topCoins: CMCData[];
  isLoading: boolean;
  matchCoins: (projects: Project[]) => Promise<Project[]>;
}

interface CMCData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_1h: number;
  cmc_id: number;
  rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  market_cap_dominance: number;
  fully_diluted_market_cap: number;
  image: string;
}

const CMCContext = createContext<CMCContextType>({
  topCoins: [],
  isLoading: true,
  matchCoins: async () => [],
});

export function CMCProvider({ children }: { children: React.ReactNode }) {
  const [topCoins, setTopCoins] = useState<CMCData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const matchCache = React.useRef<
    Map<string, { matched: boolean; data?: CMCData }>
  >(new Map());

  useEffect(() => {
    const fetchTopCoins = async () => {
      try {
        // First fetch all coins for the table
        const { data: allCoinsData } = await axios.post(API_ENDPOINTS.CMC, {
          fallbackMode: true,
          reason: "Initial data fetch for table",
        });

        // Convert the data object to array and assert type
        const coinsArray = Object.values(allCoinsData.data || {}) as CMCData[];
        setTopCoins(coinsArray);
      } catch (error: unknown) {
        // Handle error silently but ensure type safety
        if (error instanceof Error) {
          // Log error for debugging but don't expose to user
          console.error("Failed to fetch CMC data:", error.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopCoins();
  }, []);

  const matchCoins = React.useCallback(
    async (projects: Project[]) => {
      if (!topCoins.length) return projects;

      // Get unique symbols that need CMC data
      const uniqueSymbols = Array.from(
        new Set(
          projects
            .filter((p) => !p.coingecko_matched)
            .map((p) => p.coin_or_project?.toLowerCase().trim())
            .filter(Boolean)
        )
      );

      if (uniqueSymbols.length === 0) return projects;

      try {
        // Fetch specific coins from CMC
        const { data: cmcData } = await axios.post(API_ENDPOINTS.CMC, {
          symbols: uniqueSymbols,
          fallbackMode: true,
          reason: "Symbols not found in CoinGecko",
        });

        // Update topCoins with new data
        const newCoins = Object.values(cmcData.data || {}) as CMCData[];
        setTopCoins((prev) => {
          const existing = new Map(
            prev.map((c) => [c.symbol.toLowerCase(), c])
          );
          newCoins.forEach((coin) => {
            existing.set(coin.symbol.toLowerCase(), coin);
          });
          return Array.from(existing.values());
        });
      } catch (error: unknown) {
        // Handle error silently but ensure type safety
        if (error instanceof Error) {
          // Log error for debugging but don't expose to user
          console.error("Failed to fetch CMC data for symbols:", error.message);
        }
      }

      return projects.map((project) => {
        const projectName = project.coin_or_project?.toLowerCase().trim() || "";
        if (!projectName) return { ...project, cmc_matched: false };

        // Check cache first
        const cached = matchCache.current.get(projectName);
        if (cached) {
          return {
            ...project,
            cmc_matched: cached.matched,
            cmc_data: cached.data,
          };
        }

        // Extract potential ticker if it exists ($XXX)
        const tickerMatch = projectName.match(/\$([a-zA-Z0-9]+)/);
        const ticker = tickerMatch ? tickerMatch[1].toLowerCase() : "";

        // Remove ticker symbols and clean name
        const cleanedName = projectName
          .replace(/\s*\(\$[^)]+\)/g, "")
          .replace(/\$[a-zA-Z0-9]+/, "")
          .toLowerCase()
          .trim();

        // Skip if cleaned name is too short or contains numbers
        if (cleanedName.length < 2 || /\d/.test(cleanedName)) {
          matchCache.current.set(projectName, { matched: false });
          return { ...project, cmc_matched: false };
        }

        // Try to find matching coin
        const matchedCoin = topCoins.find((coin) => {
          const symbol = coin.symbol.toLowerCase().trim();
          const name = coin.name.toLowerCase().trim();

          // First try exact matches with ticker
          if (ticker && symbol === ticker) return true;

          // Then try exact matches with name
          if (name === cleanedName || symbol === cleanedName) return true;

          // Then try partial matches
          const nameMatch =
            name.includes(cleanedName) || cleanedName.includes(name);
          const symbolMatch =
            symbol.includes(cleanedName) || cleanedName.includes(symbol);

          return (nameMatch || symbolMatch) && cleanedName.length > 2;
        });

        // Cache and return result
        if (matchedCoin) {
          matchCache.current.set(projectName, {
            matched: true,
            data: matchedCoin,
          });
          return {
            ...project,
            cmc_matched: true,
            cmc_data: matchedCoin,
          };
        }

        matchCache.current.set(projectName, { matched: false });
        return { ...project, cmc_matched: false };
      });
    },
    [topCoins]
  );

  return (
    <CMCContext.Provider value={{ topCoins, isLoading, matchCoins }}>
      {children}
    </CMCContext.Provider>
  );
}

export function useCMC() {
  return useContext(CMCContext);
}

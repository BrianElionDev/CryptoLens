"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
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

  const matchCoins = useCallback(
    async (projects: Project[]) => {
      if (!topCoins.length) return projects;

      // Common name and symbol mappings
      const nameMappings: Record<string, { id: string; symbol: string }> = {
        mantra: { id: "mantra", symbol: "om" },
        "mantra dao": { id: "mantra", symbol: "om" },
        "mantra protocol": { id: "mantra", symbol: "om" },
        terra: { id: "terra-luna-2", symbol: "luna" },
        "terra luna": { id: "terra-luna-2", symbol: "luna" },
        "terra 2.0": { id: "terra-luna-2", symbol: "luna" },
        helium: { id: "helium", symbol: "hnt" },
        "immutable x": { id: "immutable-x", symbol: "imx" },
        immutable: { id: "immutable-x", symbol: "imx" },
        xai: { id: "xai", symbol: "xai" },
        beam: { id: "beam", symbol: "beam" },
        ronin: { id: "ronin", symbol: "ron" },
        hive: { id: "hive", symbol: "hive" },
        "mog coin": { id: "mog-coin", symbol: "mog" },
        binaryx: { id: "binaryx", symbol: "bnx" },
        dogwifhat: { id: "dogwifhat", symbol: "wif" },
        gigachad: { id: "gigachad", symbol: "giga" },
        clearpool: { id: "clearpool", symbol: "cpool" },
        centrifuge: { id: "centrifuge", symbol: "cfg" },
        automata: { id: "automata", symbol: "ata" },
        pendle: { id: "pendle", symbol: "pendle" },
        chiliz: { id: "chiliz", symbol: "chz" },
        "green metaverse token": { id: "green-metaverse-token", symbol: "gmt" },
        brett: { id: "brett", symbol: "brett" },
        "render token": { id: "render-token", symbol: "rndr" },
        revv: { id: "revv", symbol: "revv" },
        ankr: { id: "ankr", symbol: "ankr" },
        bittorrent: { id: "bittorrent", symbol: "btt" },
        floki: { id: "floki", symbol: "floki" },
        "axie infinity": { id: "axie-infinity", symbol: "axs" },
        bera: { id: "bera", symbol: "bera" },
        goat: { id: "goat", symbol: "goat" },
        grok: { id: "grok", symbol: "grok" },
        fantom: { id: "fantom", symbol: "ftm" },
        move: { id: "move", symbol: "move" },
        berachain: { id: "berachain", symbol: "bera" },
        nano: { id: "nano", symbol: "xno" },
        "dexcheck ai": { id: "dexcheck-ai", symbol: "dck" },
        nillion: { id: "nillion", symbol: "nil" },
        "aioz network": { id: "aioz-network", symbol: "aioz" },
        wormhole: { id: "wormhole", symbol: "w" },
        onyxcoin: { id: "onyxcoin", symbol: "onyx" },
        babylon: { id: "babylon", symbol: "bbln" },
      };

      // Define excludeTerms inside useCallback to avoid dependency issues
      const excludeTerms = ["token", "coin", "protocol", "network"];

      const matchedProjects = await Promise.all(
        projects.map(async (project) => {
          const projectName =
            project.coin_or_project?.toLowerCase().trim() || "";
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

          // Try direct mapping first
          const mapping = nameMappings[projectName];
          if (mapping) {
            const matchedCoin = topCoins.find(
              (coin) =>
                coin.id.toLowerCase() === mapping.id ||
                coin.symbol.toLowerCase() === mapping.symbol
            );
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
          excludeTerms.forEach((term) => {
            cleanedName = cleanedName
              .replace(new RegExp(`^${term}\\s+`, "i"), "")
              .replace(new RegExp(`\\s+${term}$`, "i"), "")
              .trim();
          });

          // Skip if cleaned name is too short
          if (cleanedName.length < 2) {
            matchCache.current.set(projectName, { matched: false });
            return { ...project, cmc_matched: false };
          }

          // Try to find matching coin
          const matchedCoin = topCoins.find((coin) => {
            const symbol = coin.symbol.toLowerCase().trim();
            const name = coin.name.toLowerCase().trim();

            // First try exact matches
            if (ticker && symbol === ticker) return true;
            if (name === cleanedName) return true;
            if (symbol === cleanedName) return true;

            // Handle common variations
            const variations = [
              cleanedName,
              cleanedName.replace(/\s+/g, "-"),
              cleanedName.replace(/\s+/g, ""),
              cleanedName.replace(/-/g, " "),
            ];

            return variations.some(
              (variation) =>
                name === variation ||
                symbol === variation ||
                name.includes(variation) ||
                variation.includes(name)
            );
          });

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
        })
      );
      return matchedProjects;
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

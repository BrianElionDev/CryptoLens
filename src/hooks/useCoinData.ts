import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { KnowledgeItem } from "@/types/knowledge";
import { toast } from "react-hot-toast";
import { useRef, useEffect } from "react";

// Keep track of market data between renders
const marketDataRef: { current: Record<string, CoinData> } = { current: {} };
const loadedSymbolsRef: { current: Set<string> } = { current: new Set() };

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: null;
  last_updated: string;
  price: number;
  volume_24h: number;
  percent_change_24h: number;
  coingecko_id?: string;
  cmc_id?: number;
  data_source: "coingecko" | "cmc";
}

export interface CoinHistoryData {
  date: string;
  price: number;
}

// Constants
const API_TIMEOUT = 30000;

export function useCoinData(
  symbols: string[],
  refreshKey = 0,
  mode: "quick" | "full" = "full"
) {
  // Extract dependencies for useEffect
  const symbolsKey = symbols.sort().join(",");

  useEffect(() => {
    return () => {
      // Cleanup on unmount - clear data for these symbols
      symbols.forEach((symbol) => {
        const key = symbol.toLowerCase();
        delete marketDataRef.current[key];
        loadedSymbolsRef.current.delete(key);
      });
    };
  }, [symbolsKey, symbols]);

  // Normalize symbol for matching
  const normalizeSymbol = (symbol: string) => {
    return symbol
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // Remove special characters
      .replace(/\s+/g, "") // Remove spaces
      .replace(/dao$/, "") // Remove 'dao' suffix
      .replace(/token$/, "") // Remove 'token' suffix
      .replace(/coin$/, ""); // Remove 'coin' suffix
  };

  // CoinGecko Query
  const geckoQuery = useQuery<
    {
      data: Record<string, CoinData>;
      timestamp: number;
    },
    AxiosError
  >({
    queryKey: ["coinGeckoData", symbolsKey, mode, refreshKey],
    queryFn: async () => {
      console.log("Querying CoinGecko with symbols:", symbols);
      const response = await axios.post(
        "/api/coingecko",
        {
          symbols,
          mode,
        },
        { timeout: API_TIMEOUT }
      );
      console.log("CoinGecko response format:", {
        keys: Object.keys(response.data.data || {}),
        firstItem: Object.values(response.data.data || {})[0],
        mantraData:
          response.data.data?.["mantra"] || response.data.data?.["MANTRA"],
      });
      return response.data;
    },
    staleTime: 10000,
    gcTime: 30000,
    refetchInterval: 15000,
  });

  // Get missing symbols from CoinGecko response
  const foundInGecko = new Set(
    Object.keys(geckoQuery.data?.data || {}).map((s) => s.toLowerCase())
  );
  console.log("Found in CoinGecko:", {
    keys: Array.from(foundInGecko),
    hasMantra: Array.from(foundInGecko).includes("mantra"),
    rawKeys: Object.keys(geckoQuery.data?.data || {}),
  });
  const missingSymbols = symbols.filter(
    (s) => !foundInGecko.has(normalizeSymbol(s))
  );

  // CMC Query - only runs for missing symbols
  const cmcQuery = useQuery<
    {
      data: Record<string, CoinData>;
      timestamp: number;
    },
    AxiosError
  >({
    queryKey: ["cmcData", missingSymbols.sort().join(","), mode, refreshKey],
    queryFn: async () => {
      if (missingSymbols.length === 0) {
        return { data: {}, timestamp: Date.now() };
      }
      console.log("Querying CMC with symbols:", missingSymbols);
      const response = await axios.post(
        "/api/coinmarketcap",
        {
          symbols: missingSymbols,
          fallbackMode: true,
          reason: "Symbols not found in CoinGecko",
        },
        { timeout: API_TIMEOUT }
      );
      console.log("CMC response format:", {
        keys: Object.keys(response.data.data || {}),
        firstItem: Object.values(response.data.data || {})[0],
        mantraData:
          response.data.data?.["mantra"] || response.data.data?.["MANTRA"],
      });
      return response.data;
    },
    enabled: missingSymbols.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Merge data from both queries
  const mergedData = {
    data: (() => {
      // Create a Map to deduplicate by ID and symbol
      const uniqueCoins = new Map<string, CoinData>();

      // Process CoinGecko data first (preferred source)
      Object.entries(geckoQuery.data?.data || {}).forEach(([key, coin]) => {
        console.log("Processing CoinGecko coin:", key, coin.symbol);
        uniqueCoins.set(key.toLowerCase(), coin);
      });

      // Then add CMC data for coins not already in the map
      Object.entries(cmcQuery.data?.data || {}).forEach(([key, coin]) => {
        console.log("Processing CMC coin:", key, coin.symbol);
        if (!uniqueCoins.has(key.toLowerCase())) {
          uniqueCoins.set(key.toLowerCase(), coin);
        }
      });

      console.log("Final merged coins:", Array.from(uniqueCoins.keys()));
      return Array.from(uniqueCoins.values());
    })(),
    timestamp: Math.max(
      geckoQuery.data?.timestamp || 0,
      cmcQuery.data?.timestamp || 0
    ),
    loadedCount: loadedSymbolsRef.current.size,
  };

  return {
    data: mergedData,
    isLoading:
      geckoQuery.isLoading || (missingSymbols.length > 0 && cmcQuery.isLoading),
    isError:
      geckoQuery.isError || (missingSymbols.length > 0 && cmcQuery.isError),
    isFetching:
      geckoQuery.isFetching ||
      (missingSymbols.length > 0 && cmcQuery.isFetching),
  };
}

export function useCoinHistory(symbol: string, timeframe: string = "1") {
  const queryClient = useQueryClient();

  return useQuery<CoinHistoryData[], AxiosError>({
    queryKey: ["coin-history", symbol, timeframe],
    queryFn: async (): Promise<CoinHistoryData[]> => {
      // Check cache first
      const cacheKey = ["coin-history", symbol, timeframe] as const;
      const cachedData = queryClient.getQueryData<CoinHistoryData[]>(cacheKey);
      if (cachedData) return cachedData;

      const promise = axios
        .get<CoinHistoryData[]>(
          `${API_ENDPOINTS.COIN.HISTORY(symbol)}?days=${timeframe}`
        )
        .then(({ data }) => {
          return data;
        })
        .catch((error: AxiosError) => {
          throw error;
        });

      return promise;
    },
    staleTime: 300000,
    gcTime: 600000,
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
    retry: (failureCount: number, error: Error | AxiosError) => {
      if (axios.isAxiosError(error) && error.response?.status === 429)
        return false;
      return failureCount < 2;
    },
  });
}

export function useKnowledgeData() {
  const prevDataLength = useRef<number>(0);

  return useQuery<KnowledgeItem[], AxiosError>({
    queryKey: ["knowledge"],
    queryFn: async (): Promise<KnowledgeItem[]> => {
      const response = await axios.get<{ knowledge: KnowledgeItem[] }>(
        "/api/knowledge",
        {
          headers: {
            "Cache-Control": "no-cache",
            tags: "knowledge",
          },
        }
      );
      const data = response.data.knowledge;

      // Check if we have new data
      if (prevDataLength.current > 0 && data.length > prevDataLength.current) {
        const newItemsCount = data.length - prevDataLength.current;
        toast.success(`${newItemsCount} new items added to the database!`);
      }

      prevDataLength.current = data.length;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute stale time
    gcTime: 1000 * 60 * 5, // 5 minutes cache time
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 2,
  });
}

export function useCoinDataQuery() {
  return useQuery({
    queryKey: ["coins"],
    queryFn: async () => {
      const response = await axios.get<CoinData[]>("/api/coins/markets");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

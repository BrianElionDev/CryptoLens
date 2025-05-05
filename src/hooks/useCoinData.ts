import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { KnowledgeItem } from "@/types/knowledge";
import { toast } from "react-hot-toast";
import { useRef, useEffect } from "react";

// Keep track of market data between renders
const marketDataRef: { current: Record<string, CoinData> } = { current: {} };
const loadedSymbolsRef: { current: Set<string> } = { current: new Set() };

// Debug flag to control logging
const DEBUG_LOGS = false;

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
      if (DEBUG_LOGS)
        console.log(`Querying CoinGecko for ${symbols.length} symbols...`);
      const response = await axios.post(
        "/api/coingecko",
        {
          symbols,
          mode,
        },
        { timeout: API_TIMEOUT }
      );

      const coinCount = Object.keys(response.data.data || {}).length;
      if (DEBUG_LOGS) console.log(`CoinGecko response: ${coinCount} coins`);
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

      if (DEBUG_LOGS)
        console.log(
          `Querying CMC for ${missingSymbols.length} missing symbols...`
        );
      const response = await axios.post(
        "/api/coinmarketcap",
        {
          symbols: missingSymbols,
          fallbackMode: true,
          reason: "Symbols not found in CoinGecko",
        },
        { timeout: API_TIMEOUT }
      );

      const coinCount = Object.keys(response.data.data || {}).length;
      if (DEBUG_LOGS) console.log(`CMC response: ${coinCount} coins`);
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
      let geckoCount = 0;
      let cmcCount = 0;

      // Process CoinGecko data first (preferred source)
      if (geckoQuery.data?.data) {
        geckoCount = Object.keys(geckoQuery.data.data).length;
        Object.entries(geckoQuery.data.data).forEach(([key, coin]) => {
          uniqueCoins.set(key.toLowerCase(), coin);
        });
      }

      // Then add CMC data for coins not already in the map
      if (cmcQuery.data?.data) {
        cmcCount = Object.keys(cmcQuery.data.data).length;
        Object.entries(cmcQuery.data.data).forEach(([key, coin]) => {
          if (!uniqueCoins.has(key.toLowerCase())) {
            uniqueCoins.set(key.toLowerCase(), coin);
          }
        });
      }

      // Only log this once at the end - more concise summary
      if (missingSymbols.length > 0 && cmcCount > 0) {
        console.log(
          `Data: CoinGecko: ${geckoCount}, CMC: ${cmcCount}, Total: ${uniqueCoins.size} coins`
        );
      }

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
  const queryClient = useQueryClient();
  const hasAttemptedFullLoad = useRef(false);

  return useQuery<KnowledgeItem[], AxiosError>({
    queryKey: ["knowledge"],
    queryFn: async (): Promise<KnowledgeItem[]> => {
      // Check if we need a full data load
      const needsFullLoad =
        !hasAttemptedFullLoad.current || // First attempt
        sessionStorage.getItem("navigatingBackToCryptoMarkets") === "true" || // Coming back to the page
        sessionStorage.getItem("needsDataRefresh") === "true"; // Data was previously incomplete

      // Check if we already have complete data
      const hasCompleteData =
        sessionStorage.getItem("completeDataLoaded") === "true";

      // Log the fetch attempt context
      console.log(
        `Fetching knowledge data... (needs full load: ${needsFullLoad}, has complete data: ${hasCompleteData})`
      );

      // If we need a full load or don't have complete data, force a fresh request
      const forceFresh = needsFullLoad && !hasCompleteData;

      // Mark that we've attempted a full load
      hasAttemptedFullLoad.current = true;

      // Make the API request with appropriate caching settings
      const response = await axios.get<{ knowledge: KnowledgeItem[] }>(
        "/api/knowledge",
        {
          headers: {
            // Force no cache when we need fresh data
            "Cache-Control": forceFresh ? "no-cache, no-store" : "max-age=0",
            Pragma: forceFresh ? "no-cache" : undefined,
            tags: "knowledge",
          },
          params: {
            // Always request all data
            limit: "all",
            // Add cache-busting timestamp when forcing fresh data
            _t: forceFresh ? Date.now() : undefined,
          },
        }
      );

      const data = response.data.knowledge;
      console.log(`Received ${data.length} knowledge items from API`);

      // Count channels to verify data completeness
      const channels = new Set<string>();
      data.forEach((item) => {
        if (item["channel name"]) {
          channels.add(item["channel name"]);
        }
      });
      console.log(`Found ${channels.size} unique channels in API response`);

      // Mark data as complete if it meets our criteria
      const isComplete = channels.size >= 7 && data.length >= 200;
      if (isComplete) {
        sessionStorage.setItem("completeDataLoaded", "true");
        console.log("Data completeness verified ✓");
      } else {
        console.warn("Data may be incomplete! Consider refetching.");
      }

      // Clear navigation flags
      sessionStorage.removeItem("navigatingBackToCryptoMarkets");
      sessionStorage.removeItem("needsDataRefresh");
      sessionStorage.removeItem("navigatingFromAnalytics");

      // Check if we have new data compared to previous load
      if (prevDataLength.current > 0 && data.length > prevDataLength.current) {
        const newItemsCount = data.length - prevDataLength.current;
        toast.success(`${newItemsCount} new items added to the database!`);
      }

      // Store the full data in cache for better navigation experience
      if (data.length > prevDataLength.current) {
        queryClient.setQueryData(["knowledge"], data);
        prevDataLength.current = data.length;
      }

      return data;
    },
    staleTime: 1000 * 60, // 1 minute stale time
    gcTime: 1000 * 60 * 10, // 10 minutes cache time
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3, // Increased retry attempts
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

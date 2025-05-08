import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS } from "@/config/api";
import { useEffect } from "react";

// Keep track of market data between renders
const marketDataRef: { current: Record<string, CoinData> } = { current: {} };
const loadedSymbolsRef: { current: Set<string> } = { current: new Set() };

// Cache functions for storing and retrieving coin data
const CACHE_KEY_GECKO = "cryptolens_coingecko_cache";
const CACHE_KEY_CMC = "cryptolens_cmc_cache";
const CACHE_EXPIRY = 30 * 60 * 1000; // Extend to 30 minutes to reduce API calls

function getCachedData(cacheKey: string) {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Return even expired cache data with flag if available
    const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

    if (isExpired) {
      console.log(`Using expired cache for ${cacheKey} as fallback`);
      return { data, timestamp, isExpired: true };
    }

    return { data, timestamp, isExpired: false };
  } catch (error) {
    console.error("Error retrieving cache:", error);
    return null;
  }
}

function setCachedData(cacheKey: string, data: Record<string, CoinData>) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

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

      // Try to get data from cache first
      const cachedData = getCachedData(CACHE_KEY_GECKO);
      if (cachedData && symbols.length > 0) {
        const cachedCoins = new Set(
          Object.keys(cachedData.data).map((s) => s.toLowerCase())
        );
        const allSymbolsCached = symbols.every((s) =>
          cachedCoins.has(s.toLowerCase())
        );

        if (allSymbolsCached) {
          console.log("Using cached CoinGecko data");
          return cachedData;
        }
      }

      // Implement retry with exponential backoff for rate limiting
      const MAX_RETRIES = 3;
      let retries = 0;

      const fetchWithRetry = async () => {
        try {
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

          // Save response to cache
          if (
            response.data.data &&
            Object.keys(response.data.data).length > 0
          ) {
            setCachedData(CACHE_KEY_GECKO, response.data.data);
          }

          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            if (retries < MAX_RETRIES) {
              // Exponential backoff: 2s, 4s, 8s
              const delay = Math.pow(2, retries + 1) * 1000;
              console.log(
                `CoinGecko API rate limited. Retrying in ${delay / 1000}s...`
              );
              retries++;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return fetchWithRetry();
            }
            console.warn(
              `CoinGecko API rate limited. Max retries (${MAX_RETRIES}) reached.`
            );
          }
          throw error;
        }
      };

      return fetchWithRetry();
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
    retry: (failureCount, error) => {
      // Don't use React Query's built-in retry for rate limits as we handle it manually
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return false;
      }
      // For other errors, retry up to 2 times
      return failureCount < 2;
    },
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

      // Try to get data from cache first
      const cachedData = getCachedData(CACHE_KEY_CMC);
      if (cachedData && missingSymbols.length > 0) {
        const cachedCoins = new Set(
          Object.keys(cachedData.data).map((s) => s.toLowerCase())
        );
        const allSymbolsCached = missingSymbols.every((s) =>
          cachedCoins.has(s.toLowerCase())
        );

        if (allSymbolsCached) {
          console.log("Using cached CMC data");
          return cachedData;
        }
      }

      // Implement retry with exponential backoff for rate limiting
      const MAX_RETRIES = 3;
      let retries = 0;

      const fetchWithRetry = async () => {
        try {
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

          // Save response to cache
          if (
            response.data.data &&
            Object.keys(response.data.data).length > 0
          ) {
            setCachedData(CACHE_KEY_CMC, response.data.data);
          }

          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            if (retries < MAX_RETRIES) {
              // Exponential backoff: 2s, 4s, 8s
              const delay = Math.pow(2, retries + 1) * 1000;
              console.log(
                `CMC API rate limited. Retrying in ${delay / 1000}s...`
              );
              retries++;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return fetchWithRetry();
            }
            console.warn(
              `CMC API rate limited. Max retries (${MAX_RETRIES}) reached.`
            );
          }
          throw error;
        }
      };

      return fetchWithRetry();
    },
    enabled: missingSymbols.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    retry: (failureCount, error) => {
      // Don't use React Query's built-in retry for rate limits
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return false;
      }
      // For other errors, retry up to 2 times
      return failureCount < 2;
    },
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
    refetch: async () => {
      const results = await Promise.allSettled([
        geckoQuery.refetch(),
        missingSymbols.length > 0 ? cmcQuery.refetch() : Promise.resolve(),
      ]);
      return results;
    },
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

export function useCoinDataQuery() {
  return useQuery({
    queryKey: ["coins"],
    queryFn: async () => {
      // Try to get data from cache first
      const DIRECT_API_CACHE_KEY = "cryptolens_direct_api_cache";
      const cachedData = getCachedData(DIRECT_API_CACHE_KEY);

      // Always use cached data if available, even if expired
      if (cachedData?.data && Object.keys(cachedData.data).length > 0) {
        console.log(
          "Using cached direct API data",
          cachedData.isExpired ? "(expired)" : ""
        );
        return Object.values(cachedData.data);
      }

      // Implement retry with exponential backoff for rate limiting
      const MAX_RETRIES = 5;
      let retries = 0;

      const fetchWithRetry = async (): Promise<CoinData[]> => {
        try {
          const response = await axios.get<CoinData[]>("/api/coins/markets");

          // Save to cache
          if (response.data && response.data.length > 0) {
            const dataMap: Record<string, CoinData> = {};
            response.data.forEach((coin) => {
              if (coin.id) dataMap[coin.id] = coin;
            });
            setCachedData(DIRECT_API_CACHE_KEY, dataMap);
            console.log(
              `Cached ${response.data.length} coins to local storage`
            );
          }

          return response.data;
        } catch (error) {
          if (
            axios.isAxiosError(error) &&
            (error.response?.status === 429 || error.response?.status === 403)
          ) {
            if (retries < MAX_RETRIES) {
              // Use longer and more randomized backoff to avoid concurrent retries
              const baseDelay = Math.pow(2, retries) * 1500; // Start with 3s, then 6s, 12s, etc.
              const jitter = Math.random() * 1000; // Add up to 1s random jitter
              const delay = baseDelay + jitter;

              console.log(
                `API rate limited. Retrying in ${(delay / 1000).toFixed(
                  1
                )}s... (attempt ${retries + 1}/${MAX_RETRIES})`
              );
              retries++;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return fetchWithRetry();
            }

            // If we have a cache but it was expired, return it as fallback after all retries fail
            if (cachedData?.data) {
              console.log(
                "Rate limit exceeded. Falling back to expired cache data"
              );
              return Object.values(cachedData.data);
            }
          }
          console.error("Failed to fetch market data:", error);
          throw error;
        }
      };

      return fetchWithRetry();
    },
    staleTime: 10 * 60 * 1000, // Increase stale time to 10 minutes
    gcTime: 30 * 60 * 1000, // Increase cache time to 30 minutes
    refetchInterval: 15 * 60 * 1000, // Reduce refetch frequency to 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      // Don't use React Query's built-in retry for rate limits
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 429 || error.response?.status === 403)
      ) {
        return false;
      }
      // For other errors, retry up to 2 times
      return failureCount < 2;
    },
  });
}

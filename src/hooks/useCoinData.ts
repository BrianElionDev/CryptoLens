import { useQuery, useQueryClient, Query } from "@tanstack/react-query";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { KnowledgeItem } from "@/types/knowledge";
import { toast } from "react-hot-toast";
import { useRef } from "react";

// Add request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

export interface CoinData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  percent_change_24h: number;
  circulating_supply: number;
  image: string;
  coingecko_id: string;
}

export interface CoinHistoryData {
  date: string;
  price: number;
}

export function useCoinData(symbols: string[]) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["coins-market", symbols.sort().join(",")],
    queryFn: async () => {
      if (!symbols.length) return [];

      // Check if we have fresh data in the cache first
      const cacheKey = ["coins-market", symbols.sort().join(",")];
      const cachedData = queryClient.getQueryData<CoinData[]>(cacheKey);
      const now = Date.now();
      const cacheAge = (cachedData as any)?.timestamp
        ? now - (cachedData as any).timestamp
        : Infinity;

      if (cachedData && cacheAge < 30000) {
        return cachedData;
      }

      // Check if any single coin queries are fresher
      if (symbols.length === 1) {
        const batchQueries = queryClient.getQueriesData<CoinData[]>({
          queryKey: ["coins-market"],
        });

        for (const [key, data] of batchQueries) {
          if (!data || !Array.isArray(data)) continue;
          const coinData = data.find((c) => c.coingecko_id === symbols[0]);
          if (coinData) {
            const dataAge = (data as any)?.timestamp
              ? now - (data as any).timestamp
              : Infinity;
            if (dataAge < 30000) {
              return [coinData];
            }
          }
        }
      }

      // Deduplicate requests but with a short timeout
      const requestKey = symbols.sort().join(",");
      if (pendingRequests.has(requestKey)) {
        const pendingPromise = pendingRequests.get(requestKey);
        // Only use pending request if it's less than 5 seconds old
        if (Date.now() - (pendingPromise as any).timestamp < 5000) {
          return pendingPromise;
        }
        pendingRequests.delete(requestKey);
      }

      const promise = axios
        .post<{ data: Record<string, CoinData> }>(
          "/api/coingecko",
          { symbols },
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        )
        .then(({ data }) => {
          const result = Object.values(data.data);
          (result as any).timestamp = Date.now();

          // Update all related queries in the cache
          const batchQueries = queryClient.getQueriesData<CoinData[]>({
            queryKey: ["coins-market"],
          });

          for (const [key, data] of batchQueries) {
            if (!data || !Array.isArray(data)) continue;
            const updatedData = [...data];
            let hasUpdates = false;

            result.forEach((newCoin) => {
              const index = updatedData.findIndex(
                (c) => c.coingecko_id === newCoin.coingecko_id
              );
              if (index !== -1) {
                updatedData[index] = newCoin;
                hasUpdates = true;
              }
            });

            if (hasUpdates) {
              (updatedData as any).timestamp = Date.now();
              queryClient.setQueryData(key, updatedData);
            }
          }

          pendingRequests.delete(requestKey);
          return result;
        })
        .catch((error) => {
          pendingRequests.delete(requestKey);
          // If we get rate limited and have cached data, use it
          if (error?.response?.status === 429 && cachedData) {
            return cachedData;
          }
          throw error;
        });

      // Add timestamp to the promise for age checking
      (promise as any).timestamp = Date.now();
      pendingRequests.set(requestKey, promise);
      return promise;
    },
    staleTime: 30000, // Data becomes stale after 30 seconds
    gcTime: 60000, // Keep unused data for 1 minute
    enabled: symbols.length > 0,
    refetchInterval: 30000, // 30 second interval to avoid rate limits
    refetchIntervalInBackground: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useCoinHistory(symbol: string, timeframe: string = "1") {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["coin-history", symbol, timeframe],
    queryFn: async () => {
      // Check cache first
      const cacheKey = ["coin-history", symbol, timeframe];
      const cachedData = queryClient.getQueryData(cacheKey);
      if (cachedData) return cachedData;

      // Deduplicate requests
      const requestKey = `${symbol}-${timeframe}`;
      if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
      }

      const promise = axios
        .get<CoinHistoryData[]>(
          `${API_ENDPOINTS.COIN.HISTORY(symbol)}?days=${timeframe}`
        )
        .then(({ data }) => {
          pendingRequests.delete(requestKey);
          return data;
        })
        .catch((error) => {
          pendingRequests.delete(requestKey);
          throw error;
        });

      pendingRequests.set(requestKey, promise);
      return promise;
    },
    staleTime: 300000,
    gcTime: 600000,
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
  });
}

export function useKnowledgeData() {
  const prevDataLength = useRef<number>(0);

  return useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const response = await axios.get("/api/knowledge", {
        headers: {
          "Cache-Control": "no-cache",
          tags: "knowledge",
        },
      });
      const data = response.data.knowledge as KnowledgeItem[];

      // Check if we have new data
      if (prevDataLength.current > 0 && data.length > prevDataLength.current) {
        const newItemsCount = data.length - prevDataLength.current;
        toast.success(`${newItemsCount} new items added to the database!`);
      }

      prevDataLength.current = data.length;
      return data;
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

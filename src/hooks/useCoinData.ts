import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { KnowledgeItem } from "@/types/knowledge";
import { toast } from "react-hot-toast";
import { useRef } from "react";

interface TimestampedData {
  timestamp: number;
}

interface CachedData<T> {
  data: T[];
  timestamp: number;
}

type CoinResponse = CachedData<CoinData>;

// Add request deduplication maps
const pendingRequests = new Map<string, Promise<CoinResponse>>();
const pendingHistoryRequests = new Map<string, Promise<CoinHistoryData[]>>();

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

export function useCoinData(symbols: string[], refreshKey: number = 0) {
  const queryClient = useQueryClient();

  return useQuery<CoinResponse, AxiosError>({
    queryKey: ["coins-market", symbols.sort().join(","), refreshKey],
    queryFn: async (): Promise<CoinResponse> => {
      if (!symbols.length) return { data: [], timestamp: Date.now() };

      // Check if we have fresh data in the cache first
      const cacheKey = [
        "coins-market",
        symbols.sort().join(","),
        refreshKey,
      ] as const;
      const cachedData = queryClient.getQueryData<CoinResponse>(cacheKey);
      const now = Date.now();
      const cacheAge = cachedData?.timestamp
        ? now - cachedData.timestamp
        : Infinity;

      // Only use cache if it's less than 30 seconds old
      if (cachedData && cacheAge < 30000) {
        return cachedData;
      }

      // Check if any single coin queries are fresher
      if (symbols.length === 1) {
        const batchQueries = queryClient.getQueriesData<CoinResponse>({
          queryKey: ["coins-market"],
        });

        for (const [queryKey] of batchQueries) {
          const data = queryClient.getQueryData<CoinResponse>(queryKey);
          if (!data?.data) continue;
          const coinData = data.data.find((c) => c.coingecko_id === symbols[0]);
          if (coinData) {
            const dataAge = data.timestamp ? now - data.timestamp : Infinity;
            if (dataAge < 30000) {
              return { data: [coinData], timestamp: Date.now() };
            }
          }
        }
      }

      // Deduplicate requests but with a short timeout
      const requestKey = symbols.sort().join(",");
      const pendingPromise = pendingRequests.get(requestKey);
      if (pendingPromise) {
        // Only use pending request if it's less than 5 seconds old
        const timestampedPromise = pendingPromise as Promise<CoinResponse> &
          TimestampedData;
        if (Date.now() - timestampedPromise.timestamp < 5000) {
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
          const result: CoinResponse = {
            data: Object.values(data.data),
            timestamp: Date.now(),
          };

          // Update all related queries in the cache
          const batchQueries = queryClient.getQueriesData<CoinResponse>({
            queryKey: ["coins-market"],
          });

          for (const [queryKey, queryData] of batchQueries) {
            if (!queryData?.data) continue;
            const updatedData = [...queryData.data];
            let hasUpdates = false;

            result.data.forEach((newCoin) => {
              const index = updatedData.findIndex(
                (c) => c.coingecko_id === newCoin.coingecko_id
              );
              if (index !== -1) {
                updatedData[index] = newCoin;
                hasUpdates = true;
              }
            });

            if (hasUpdates) {
              queryClient.setQueryData<CoinResponse>(queryKey, {
                data: updatedData,
                timestamp: Date.now(),
              });
            }
          }

          pendingRequests.delete(requestKey);
          return result;
        })
        .catch((error: AxiosError) => {
          pendingRequests.delete(requestKey);
          // If we get rate limited and have cached data, use it
          if (error.response?.status === 429 && cachedData) {
            return cachedData;
          }
          throw error;
        });

      // Add timestamp to the promise for age checking
      const timestampedPromise = promise as Promise<CoinResponse> &
        TimestampedData;
      timestampedPromise.timestamp = Date.now();
      pendingRequests.set(requestKey, promise);
      return promise;
    },
    staleTime: 30000,
    gcTime: 60000,
    enabled: symbols.length > 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    retry: (failureCount, error: AxiosError) => {
      if (error.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
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

      // Deduplicate requests
      const requestKey = `${symbol}-${timeframe}`;
      const pendingPromise = pendingHistoryRequests.get(requestKey);
      if (pendingPromise) {
        return pendingPromise;
      }

      const promise = axios
        .get<CoinHistoryData[]>(
          `${API_ENDPOINTS.COIN.HISTORY(symbol)}?days=${timeframe}`
        )
        .then(({ data }) => {
          pendingHistoryRequests.delete(requestKey);
          return data;
        })
        .catch((error: AxiosError) => {
          pendingHistoryRequests.delete(requestKey);
          throw error;
        });

      pendingHistoryRequests.set(requestKey, promise);
      return promise;
    },
    staleTime: 300000,
    gcTime: 600000,
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
    retry: (failureCount, error: AxiosError) => {
      if (error.response?.status === 429) return false;
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
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

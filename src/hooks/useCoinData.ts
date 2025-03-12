import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { KnowledgeItem } from "@/types/knowledge";
import { toast } from "react-hot-toast";
import { useRef, useEffect } from "react";

interface CoinResponse {
  data: CoinData[];
  timestamp: number;
  loadedCount?: number;
}

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
  coingecko_id: string;
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
  const queryClient = useQueryClient();
  const queryKey = ["coinData", symbols.sort().join(","), mode, refreshKey];
  const allData: Record<string, CoinData> = { ...marketDataRef.current };

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

  const marketQuery = useQuery<CoinResponse, AxiosError>({
    queryKey,
    queryFn: async (): Promise<CoinResponse> => {
      try {
        const response = await axios.post<{ data: Record<string, CoinData> }>(
          "/api/coingecko",
          {
            symbols,
            mode,
          },
          { timeout: API_TIMEOUT }
        );

        // Clear previous data for these symbols
        symbols.forEach((symbol) => {
          const key = symbol.toLowerCase();
          delete marketDataRef.current[key];
          loadedSymbolsRef.current.delete(key);
        });

        Object.assign(allData, response.data.data);
        Object.assign(marketDataRef.current, allData);

        Object.values(allData).forEach((coin) =>
          loadedSymbolsRef.current.add(coin.symbol.toLowerCase())
        );

        return {
          data: Object.values(allData),
          timestamp: Date.now(),
          loadedCount: loadedSymbolsRef.current.size,
        };
      } catch (error) {
        // Return cached data if available
        const cachedData = queryClient.getQueryData<CoinResponse>(queryKey);
        if (cachedData) {
          return {
            ...cachedData,
            timestamp: Date.now(),
          };
        }
        throw error;
      }
    },
    staleTime: 10000,
    gcTime: 30000,
    refetchInterval: 15000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  });

  return {
    data: marketQuery.data,
    isLoading: marketQuery.isLoading,
    isError: marketQuery.isError,
    isFetching: marketQuery.isFetching,
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
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

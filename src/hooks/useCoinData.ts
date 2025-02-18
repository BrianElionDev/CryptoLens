import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api";
import type { KnowledgeItem } from "@/types/knowledge";

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
  return useQuery({
    queryKey: ["coins-market", symbols],
    queryFn: async () => {
      if (!symbols.length) return [];

      const { data } = await axios.post<{ data: Record<string, CoinData> }>(
        "/api/coingecko",
        { symbols },
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      return Object.values(data.data);
    },
    staleTime: 0,
    gcTime: 0,
    enabled: symbols.length > 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });
}

export function useCoinHistory(symbol: string, timeframe: string = "1") {
  return useQuery({
    queryKey: ["coin-history", symbol, timeframe],
    queryFn: async () => {
      const { data } = await axios.get<CoinHistoryData[]>(
        `${API_ENDPOINTS.COIN.HISTORY(symbol)}?days=${timeframe}`
      );
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 100000, // Refetch every 100 seconds
    refetchIntervalInBackground: true,
    enabled: !!symbol,
  });
}

export function useKnowledgeData() {
  return useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const response = await axios.get("/api/knowledge", {
        headers: {
          "Cache-Control": "no-cache",
          tags: "knowledge",
        },
      });
      return response.data.knowledge as KnowledgeItem[];
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

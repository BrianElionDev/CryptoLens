import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api";

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
        { symbols }
      );

      return Object.values(data.data);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: symbols.length > 0,
  });
}

export function useCoinHistory(symbol: string) {
  return useQuery({
    queryKey: ["coin-history", symbol],
    queryFn: async () => {
      const { data } = await axios.get<CoinHistoryData[]>(
        API_ENDPOINTS.COIN.HISTORY(symbol)
      );
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

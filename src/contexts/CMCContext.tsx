"use client";

import React, {
  createContext,
  useContext,

} from "react";

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


  return (
    <CMCContext.Provider
      value={{ topCoins: [], isLoading: false, matchCoins: async () => [] }}
    >
      {children}
    </CMCContext.Provider>
  );
}

export function useCMC() {
  return useContext(CMCContext);
}

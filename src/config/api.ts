export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export const API_ENDPOINTS = {
  COIN: {
    DETAILS: (symbol: string) => `${BASE_URL}/api/coin/${symbol}`,
    HISTORY: (symbol: string) => `${BASE_URL}/api/coin/${symbol}/history`,
  },
  KNOWLEDGE: {
    BASE: `${BASE_URL}/api/knowledge`,
    ENTRY: (id: string) => `${BASE_URL}/api/knowledge/${id}`,
  },
  COINGECKO: `${BASE_URL}/api/coingecko`,
  CMC: `${BASE_URL}/api/coinmarketcap`,
  CATEGORIES: {
    LIST: `${BASE_URL}/api/categories`,
    DETAIL: (id: string) => `${BASE_URL}/api/categories/${id}`,
  },
} as const;

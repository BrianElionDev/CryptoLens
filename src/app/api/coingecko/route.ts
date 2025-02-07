import { NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  percent_change_24h: number;
  circulating_supply: number;
}

interface CoinGeckoMarketResponse {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
}

// API Configuration
const API_TIMEOUT = 30000;

// Cache for error fallback only
interface MarketCache {
  data: CoinGeckoMarketResponse[];
  timestamp: number;
}

let marketCache: MarketCache | null = null;

async function fetchAllMarketData(): Promise<{
  data: CoinGeckoMarketResponse[];
  isFresh: boolean;
}> {
  try {
    const timestamp = Date.now();
    const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 250,
        sparkline: false,
        price_change_percentage: "24h",
        t: timestamp, // Force fresh data
      },
      timeout: API_TIMEOUT,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.data) {
      throw new Error("No data received from CoinGecko");
    }

    // Create new reference to prevent caching
    const freshData = JSON.parse(JSON.stringify(response.data));
    marketCache = {
      data: freshData,
      timestamp,
    };
    return { data: freshData, isFresh: true };
  } catch (error) {
    if (marketCache) {
      return { data: marketCache.data, isFresh: false };
    }
    throw error;
  }
}

function findCoinMatch(
  searchName: string,
  marketData: CoinGeckoMarketResponse[]
): CoinGeckoMarketResponse | null {
  const normalized = searchName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Direct mappings for major coins
  const directMappings: Record<string, string> = {
    bitcoin: "bitcoin",
    btc: "bitcoin",
    ethereum: "ethereum",
    eth: "ethereum",
    solana: "solana",
    sol: "solana",
    xrp: "ripple",
    ripple: "ripple",
    doge: "dogecoin",
    dogecoin: "dogecoin",
    cardano: "cardano",
    ada: "cardano",
    polkadot: "polkadot",
    dot: "polkadot",
    chainlink: "chainlink",
    link: "chainlink",
  };

  // Check direct mappings first
  if (directMappings[normalized]) {
    const match = marketData.find(
      (coin) => coin.id === directMappings[normalized]
    );
    if (match) return match;
  }

  // Try exact matches
  const exactMatch = marketData.find(
    (coin) =>
      coin.id === normalized ||
      coin.symbol.toLowerCase() === normalized ||
      coin.id.replace(/-/g, "") === normalized
  );
  if (exactMatch) return exactMatch;

  // Try fuzzy matches
  return (
    marketData.find(
      (coin) =>
        coin.id.includes(normalized) ||
        coin.symbol.toLowerCase().includes(normalized) ||
        coin.id.replace(/-/g, "").includes(normalized)
    ) || null
  );
}

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();
    const { data: marketData, isFresh } = await fetchAllMarketData();
    const allCoinData: Record<string, CoinData> = {};

    for (const symbol of symbols) {
      const match = findCoinMatch(symbol, marketData);
      if (match) {
        allCoinData[symbol] = {
          id: match.id,
          name: symbol,
          symbol: match.symbol,
          price: match.current_price,
          market_cap: match.market_cap,
          volume_24h: match.total_volume,
          percent_change_24h: match.price_change_percentage_24h,
          circulating_supply: match.circulating_supply || 0,
        };
      }
    }

    return NextResponse.json({
      data: allCoinData,
      timestamp: Date.now(),
      isFresh,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price data", timestamp: Date.now() },
      { status: 500 }
    );
  }
}

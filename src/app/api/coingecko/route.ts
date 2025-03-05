import { NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const API_TIMEOUT = 10000;

// Rate limiting with exponential backoff
const BASE_DELAY = 60000; // 1 minute base delay
const MAX_RETRIES = 3;
let consecutiveFailures = 0;
let lastRequestTime = 0;

function getRequestDelay() {
  // Use MAX_RETRIES to cap the exponential backoff
  const backoffFactor = Math.min(consecutiveFailures, MAX_RETRIES);
  return BASE_DELAY * Math.pow(2, backoffFactor);
}

// Cache configuration
const CACHE_DURATION = 60000; // 1 minute base cache
const MAX_CACHE_DURATION = 300000; // 5 minutes max cache

function getCacheDuration() {
  return Math.min(
    CACHE_DURATION * Math.pow(2, consecutiveFailures),
    MAX_CACHE_DURATION
  );
}

// Add in-memory cache with longer duration
interface CacheEntry {
  data: Record<string, CoinData>;
  timestamp: number;
  marketData: CoinGeckoMarketResponse[];
}

let marketDataCache: CacheEntry | null = null;

interface CoinGeckoMarketResponse {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  image: string;
}

interface CoinData {
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

function findCoinMatch(
  searchName: string,
  marketData: CoinGeckoMarketResponse[]
): CoinGeckoMarketResponse | null {
  const normalized = searchName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Skip invalid or too short names
  if (normalized.length < 2) return null;

  // Direct mappings for common variations
  const directMappings: Record<string, string> = {
    // Existing mappings
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
    // Additional mappings
    avax: "avalanche-2",
    avalanche: "avalanche-2",
    bnb: "binancecoin",
    usdt: "tether",
    usdc: "usd-coin",
    tron: "tron",
    trx: "tron",
    xlm: "stellar",
    stellar: "stellar",
    aave: "aave",
    algo: "algorand",
    algorand: "algorand",
    apt: "aptos",
    aptos: "aptos",
    arb: "arbitrum",
    arbitrum: "arbitrum",
    op: "optimism",
    optimism: "optimism",
    matic: "matic-network",
    polygon: "matic-network",
    near: "near",
    ftm: "fantom",
    fantom: "fantom",
    sand: "the-sandbox",
    sandbox: "the-sandbox",
    imx: "immutable-x",
    axs: "axie-infinity",
    blur: "blur",
    mantle: "mantle",
    celestia: "celestia",
    sei: "sei-network",
    base: "coinbase-wrapped-staked-eth",
    weth: "weth",
  };

  // Check direct mappings first
  if (directMappings[normalized]) {
    const match = marketData.find(
      (coin) => coin.id === directMappings[normalized]
    );
    if (match) return match;
  }

  // Remove common suffixes for matching
  const cleanName = normalized
    .replace(/coin$/, "")
    .replace(/token$/, "")
    .replace(/protocol$/, "")
    .replace(/network$/, "");

  // Try exact matches
  const exactMatch = marketData.find(
    (coin) =>
      coin.id === cleanName ||
      coin.symbol.toLowerCase() === cleanName ||
      coin.id.replace(/-/g, "") === cleanName
  );
  if (exactMatch) return exactMatch;

  // Try fuzzy matches
  return (
    marketData.find(
      (coin) =>
        coin.id.includes(cleanName) ||
        coin.symbol.toLowerCase().includes(cleanName) ||
        coin.id.replace(/-/g, "").includes(cleanName)
    ) || null
  );
}

export async function POST(request: Request) {
  let symbols: string[] = [];
  let requestData;

  try {
    requestData = await request.json();
    symbols = requestData.symbols || [];
    const now = Date.now();

    // Enhanced cache check with dynamic duration
    if (marketDataCache) {
      const currentCacheDuration = getCacheDuration();
      if (now - marketDataCache.timestamp < currentCacheDuration) {
        const cachedData = marketDataCache.data;
        const filteredData: Record<string, CoinData> = {};

        for (const symbol of symbols) {
          if (cachedData[symbol]) {
            filteredData[symbol] = cachedData[symbol];
          }
        }

        if (Object.keys(filteredData).length === symbols.length) {
          return NextResponse.json({
            data: filteredData,
            timestamp: marketDataCache.timestamp,
            fromCache: true,
            cacheExpiry: marketDataCache.timestamp + currentCacheDuration,
          });
        }
      }
    }

    // Enhanced rate limiting with exponential backoff
    const currentDelay = getRequestDelay();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < currentDelay) {
      if (marketDataCache) {
        const cachedData = marketDataCache.data;
        const filteredData: Record<string, CoinData> = {};

        for (const symbol of symbols) {
          if (cachedData[symbol]) {
            filteredData[symbol] = cachedData[symbol];
          }
        }

        if (Object.keys(filteredData).length > 0) {
          return NextResponse.json({
            data: filteredData,
            timestamp: marketDataCache.timestamp,
            fromCache: true,
            retryAfter: Math.ceil((currentDelay - timeSinceLastRequest) / 1000),
          });
        }
      }

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((currentDelay - timeSinceLastRequest) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (currentDelay - timeSinceLastRequest) / 1000
            ).toString(),
          },
        }
      );
    }

    lastRequestTime = now;

    const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 250,
        sparkline: false,
        price_change_percentage: "24h",
        _: now,
      },
      timeout: API_TIMEOUT,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    // Reset failure count on success
    consecutiveFailures = 0;

    if (!response.data) {
      throw new Error("No data received from CoinGecko");
    }

    const marketData = response.data;
    const allCoinData: Record<string, CoinData> = {};

    for (const symbol of symbols) {
      const match = findCoinMatch(symbol, marketData);
      if (match) {
        allCoinData[symbol] = {
          id: match.id,
          name: match.name,
          symbol: match.symbol,
          price: match.current_price,
          market_cap: match.market_cap,
          volume_24h: match.total_volume,
          percent_change_24h: match.price_change_percentage_24h,
          circulating_supply: match.circulating_supply || 0,
          image: match.image || "",
          coingecko_id: match.id,
        };
      }
    }

    // Update cache with both the processed data and raw market data
    marketDataCache = {
      data: allCoinData,
      marketData,
      timestamp: now,
    };

    return NextResponse.json({
      data: allCoinData,
      timestamp: now,
      fromCache: false,
    });
  } catch (err) {
    console.error("Error in CoinGecko API:", err);

    // If we have cached data, return it
    if (marketDataCache) {
      const filteredData: Record<string, CoinData> = {};
      for (const symbol of symbols) {
        if (marketDataCache.data[symbol]) {
          filteredData[symbol] = marketDataCache.data[symbol];
        }
      }

      if (Object.keys(filteredData).length > 0) {
        return NextResponse.json({
          data: filteredData,
          timestamp: marketDataCache.timestamp,
          fromCache: true,
          error: "Using cached data due to error",
        });
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}

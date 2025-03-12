import { NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const API_TIMEOUT = 30000;

// Rate limiting with exponential backoff
const BASE_DELAY = 30000; // 30 seconds base delay
const MAX_RETRIES = 3;
const COINS_PER_PAGE = 250;

// Cache configuration
const CACHE_DURATION = 45000; // 45 seconds base cache
const QUICK_CACHE_DURATION = 60000; // 1 minute for quick mode
const MAX_CACHE_DURATION = 180000; // 3 minutes max cache

let consecutiveFailures = 0;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

function getRequestDelay() {
  const backoffFactor = Math.min(consecutiveFailures, MAX_RETRIES);
  return Math.max(
    MIN_REQUEST_INTERVAL,
    BASE_DELAY * Math.pow(1.5, backoffFactor)
  );
}

function getCacheDuration(mode: string) {
  const baseDuration = mode === "quick" ? QUICK_CACHE_DURATION : CACHE_DURATION;
  return Math.min(baseDuration * (consecutiveFailures + 1), MAX_CACHE_DURATION);
}

// Add a secondary cache for the second page
let secondaryPageCache: CoinGeckoMarketResponse[] | null = null;
let secondaryPageTimestamp = 0;

// Modify cache interface to store quick and full data separately
interface CacheEntry {
  quickData: Record<string, CoinData>;
  fullData: Record<string, CoinData>;
  marketData: CoinGeckoMarketResponse[];
  timestamp: number;
  retryAfter?: number;
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
  const normalized = searchName.toLowerCase().trim();

  // Skip invalid or too short names
  if (!normalized || normalized.length < 2) return null;

  // Extract symbol if present in format ($XXX)
  const symbolMatch = normalized.match(/\(\$([^)]+)\)/);
  const extractedSymbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";

  // Clean the name by removing ($XXX) and special chars
  const cleanName = normalized
    .replace(/\s*\(\$[^)]+\)/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();

  // Direct mappings for common variations
  const directMappings: Record<string, string> = {
    bitcoin: "bitcoin",
    btc: "bitcoin",
    ethereum: "ethereum",
    eth: "ethereum",
    solana: "solana",
    sol: "solana",
    xrp: "ripple",
    doge: "dogecoin",
    ada: "cardano",
    dot: "polkadot",
    link: "chainlink",
    avax: "avalanche-2",
    bnb: "binancecoin",
    matic: "matic-network",
    "official trump": "trump",
  };

  // Try exact matches first
  const exactMatch = marketData.find(
    (coin) =>
      coin.id === cleanName ||
      coin.symbol.toLowerCase() === cleanName ||
      coin.symbol.toLowerCase() === extractedSymbol ||
      coin.name.toLowerCase() === cleanName
  );
  if (exactMatch) return exactMatch;

  // Try direct mappings
  const mappedId = directMappings[cleanName] || directMappings[extractedSymbol];
  if (mappedId) {
    const match = marketData.find((coin) => coin.id === mappedId);
    if (match) return match;
  }

  // Try partial matches with improved scoring
  let bestMatch: { coin: CoinGeckoMarketResponse; score: number } | null = null;
  const minScore = 70; // Increase minimum score threshold

  for (const coin of marketData) {
    const coinSymbol = coin.symbol.toLowerCase();
    const coinName = coin.name.toLowerCase();
    const coinId = coin.id.toLowerCase();
    let score = 0;

    // Exact matches get highest score
    if (coinSymbol === cleanName || coinSymbol === extractedSymbol) score = 100;
    if (coinName === cleanName) score = 90;
    if (coinId === cleanName) score = 80;

    // Only proceed with fuzzy matching if no exact match was found
    if (score === 0) {
      // Symbol-based matches
      if (cleanName === coinSymbol) score += 70;
      if (extractedSymbol && extractedSymbol === coinSymbol) score += 70;

      // Name-based matches (more strict)
      if (cleanName === coinName) score += 60;
      if (coinName === cleanName) score += 60;

      // Partial matches (more conservative)
      if (coinSymbol.startsWith(cleanName)) score += 40;
      if (cleanName.startsWith(coinSymbol)) score += 35;
      if (coinName.startsWith(cleanName)) score += 30;
      if (cleanName.startsWith(coinName)) score += 25;
    }

    // Update best match if we found a better score
    if (score >= minScore && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { coin, score };
    }
  }

  return bestMatch?.coin || null;
}

// Add this helper function before the POST handler
async function fetchMarketDataPage(page: number) {
  return axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
    params: {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: COINS_PER_PAGE,
      page,
      sparkline: false,
      price_change_percentage: "24h",
      _: Date.now(),
    },
    timeout: API_TIMEOUT,
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(request: Request) {
  let requestData;
  try {
    requestData = await request.json();
  } catch (error) {
    console.error("Invalid JSON in request body:", error);
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const requestSymbols: string[] = requestData?.symbols || [];
  const mode = requestData?.mode || "full";

  try {
    const now = Date.now();
    const currentDelay = getRequestDelay();
    const timeSinceLastRequest = now - lastRequestTime;

    // More aggressive cache check for quick mode
    if (marketDataCache) {
      const currentCacheDuration = getCacheDuration(mode);
      const cacheAge = now - marketDataCache.timestamp;

      if (
        cacheAge < currentCacheDuration ||
        (mode === "quick" && cacheAge < QUICK_CACHE_DURATION)
      ) {
        const cacheToUse =
          mode === "quick"
            ? marketDataCache.quickData
            : marketDataCache.fullData;
        const filteredData = requestSymbols.reduce<Record<string, CoinData>>(
          (acc, symbol) => {
            const key = symbol.toLowerCase();
            if (cacheToUse[key]) {
              acc[key] = cacheToUse[key];
            }
            return acc;
          },
          {}
        );

        if (Object.keys(filteredData).length > 0) {
          return NextResponse.json({
            data: filteredData,
            timestamp: marketDataCache.timestamp,
            fromCache: true,
            mode,
            cacheAge,
          });
        }
      }
    }

    // Enforce rate limiting
    if (timeSinceLastRequest < currentDelay) {
      const waitTime = currentDelay - timeSinceLastRequest;
      if (marketDataCache) {
        const cacheToUse =
          mode === "quick"
            ? marketDataCache.quickData
            : marketDataCache.fullData;
        const filteredData = requestSymbols.reduce<Record<string, CoinData>>(
          (acc, symbol) => {
            const key = symbol.toLowerCase();
            if (cacheToUse[key]) {
              acc[key] = cacheToUse[key];
            }
            return acc;
          },
          {}
        );

        if (Object.keys(filteredData).length > 0) {
          return NextResponse.json({
            data: filteredData,
            timestamp: marketDataCache.timestamp,
            fromCache: true,
            stale: true,
            mode,
            retryAfter: Math.ceil(waitTime / 1000),
          });
        }
      }

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(waitTime / 1000),
        },
        { status: 429 }
      );
    }

    // Fetch market data with better rate limiting
    const allMarketData: CoinGeckoMarketResponse[] = [];
    let hasError = false;

    // Try to use secondary cache first if it exists and is fresh
    if (
      secondaryPageCache &&
      Date.now() - secondaryPageTimestamp < MAX_CACHE_DURATION
    ) {
      allMarketData.push(...secondaryPageCache);
    }

    // Always fetch first page
    try {
      const firstPagePromise = fetchMarketDataPage(1);
      let secondPagePromise: Promise<{
        data: CoinGeckoMarketResponse[];
      } | null> | null = null;

      // If we need second page and don't have fresh cache, fetch it in parallel
      if (
        !secondaryPageCache ||
        Date.now() - secondaryPageTimestamp > MAX_CACHE_DURATION
      ) {
        secondPagePromise = fetchMarketDataPage(2).catch((error) => {
          console.error("Error fetching second page:", error);
          return null;
        });
      }

      const firstPageResponse = await firstPagePromise;
      const secondPageResponse = secondPagePromise
        ? await secondPagePromise
        : null;

      if (!firstPageResponse.data || !Array.isArray(firstPageResponse.data)) {
        throw new Error("Invalid response from CoinGecko");
      }

      // Update the first page data
      allMarketData.push(...firstPageResponse.data);

      // Update secondary cache if we got second page data
      if (secondPageResponse?.data && Array.isArray(secondPageResponse.data)) {
        secondaryPageCache = secondPageResponse.data;
        secondaryPageTimestamp = Date.now();
        allMarketData.push(...secondPageResponse.data);
      } else if (secondaryPageCache) {
        // Use existing secondary cache if available
        allMarketData.push(...secondaryPageCache);
      }
    } catch (error) {
      hasError = true;
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        consecutiveFailures++;
        throw error;
      }
      console.error("Error fetching first page:", error);
      throw error;
    }

    if (!hasError) {
      consecutiveFailures = 0;
    }
    lastRequestTime = now;

    const marketData = allMarketData;
    const allCoinData: Record<string, CoinData> = {};

    // Process requested symbols with Map for O(1) lookup

    for (const symbol of requestSymbols) {
      const match = findCoinMatch(symbol, marketData);
      if (match) {
        const key = symbol.toLowerCase();
        allCoinData[key] = {
          id: match.id,
          name: match.name,
          symbol: match.symbol,
          price: match.current_price || 0,
          market_cap: match.market_cap || 0,
          volume_24h: match.total_volume || 0,
          percent_change_24h: match.price_change_percentage_24h || 0,
          circulating_supply: match.circulating_supply || 0,
          image: match.image || "",
          coingecko_id: match.id,
        };
      }
    }

    // Update cache based on mode
    if (!marketDataCache) {
      marketDataCache = {
        quickData: {},
        fullData: {},
        marketData: [],
        timestamp: now,
      };
    }

    if (mode === "quick") {
      marketDataCache.quickData = {
        ...marketDataCache.quickData,
        ...allCoinData,
      };
    } else {
      marketDataCache.fullData = {
        ...marketDataCache.fullData,
        ...allCoinData,
      };
    }
    marketDataCache.marketData = marketData;
    marketDataCache.timestamp = now;

    return NextResponse.json({
      data: allCoinData,
      timestamp: now,
      fromCache: false,
      mode,
      totalCoins: marketData.length,
    });
  } catch (error) {
    console.error("CoinGecko API Error:", error);
    consecutiveFailures++;

    // Always try to return cache on error
    if (marketDataCache) {
      const cacheToUse =
        mode === "quick" ? marketDataCache.quickData : marketDataCache.fullData;
      const filteredData = requestSymbols.reduce<Record<string, CoinData>>(
        (acc, symbol) => {
          const key = symbol.toLowerCase();
          if (cacheToUse[key]) {
            acc[key] = cacheToUse[key];
          }
          return acc;
        },
        {}
      );

      if (Object.keys(filteredData).length > 0) {
        return NextResponse.json({
          data: filteredData,
          timestamp: marketDataCache.timestamp,
          fromCache: true,
          stale: true,
          error: "Using stale cache due to API error",
          mode,
          retryAfter: Math.ceil(getRequestDelay() / 1000),
        });
      }
    }

    return NextResponse.json(
      {
        error: "Failed to fetch market data",
        details: error instanceof Error ? error.message : "Unknown error",
        retryAfter: Math.ceil(getRequestDelay() / 1000),
      },
      { status: 500 }
    );
  }
}

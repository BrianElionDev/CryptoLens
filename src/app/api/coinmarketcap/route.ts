import { NextResponse } from "next/server";
import axios from "axios";

const CMC_API_KEY = process.env.CMC_API_KEY;
const CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v1";
const API_TIMEOUT = 30000;

// Cache configuration
const CACHE_DURATION = 45000; // 45 seconds base cache

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

// Monthly rate limit tracking
const MONTHLY_LIMIT = 9000; // Keep ~3,829 calls as buffer for errors/retries
let monthlyCallCount = 0;
let monthStartTime = Date.now();

// Reset monthly counter
function resetMonthlyCounterIfNeeded() {
  const now = Date.now();
  if (now - monthStartTime >= 30 * 24 * 60 * 60 * 1000) {
    // 30 days
    monthlyCallCount = 0;
    monthStartTime = now;
  }
}

interface CMCQuote {
  price: number;
  volume_24h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_1h: number;
  market_cap: number;
  market_cap_dominance: number;
  fully_diluted_market_cap: number;
}

interface CMCResponse {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  quote: {
    USD: CMCQuote;
  };
}

interface CoinData {
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

let marketDataCache: {
  data: Record<string, CoinData>;
  timestamp: number;
} | null = null;

export async function GET() {
  console.log("CMC API Key:", CMC_API_KEY);

  if (!CMC_API_KEY) {
    return NextResponse.json(
      { error: "CMC API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Test with different limits
    const response = await axios.get(
      `${CMC_BASE_URL}/cryptocurrency/listings/latest`,
      {
        params: {
          limit: 1000,
          convert: "USD",
          sort: "market_cap",
          sort_dir: "desc",
        },
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
          Accept: "application/json",
        },
        timeout: API_TIMEOUT,
      }
    );

    const coins = response.data?.data || [];

    return NextResponse.json({
      status: "API Key working",
      total_coins_fetched: coins.length,
      first_coin: coins[0],
      last_coin: coins[coins.length - 1],
      plan_details: response.data?.status?.credit_count,
    });
  } catch (err) {
    console.error("CMC API Test Error:", err);
    if (axios.isAxiosError(err)) {
      console.log("Full error response:", err.response?.data);
    }
    return NextResponse.json(
      {
        error: "API Key test failed",
        details: err instanceof Error ? err.message : "Unknown error",
        response_data: axios.isAxiosError(err) ? err.response?.data : null,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log("CMC API called with request");

  if (!CMC_API_KEY) {
    console.log("CMC API key missing");
    return NextResponse.json(
      { error: "CMC API key not configured" },
      { status: 500 }
    );
  }

  let requestData;
  try {
    requestData = await request.json();
    console.log("CMC API request data:", requestData);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const requestSymbols: string[] = requestData?.symbols || [];
  const isFallbackMode = requestData?.fallbackMode || false;

  // If not in fallback mode and no specific reason provided, reject
  if (!isFallbackMode && !requestData?.reason) {
    return NextResponse.json(
      {
        error:
          "CMC API should only be used as fallback. Provide 'fallbackMode: true' or 'reason' for usage.",
      },
      { status: 400 }
    );
  }

  resetMonthlyCounterIfNeeded();

  // Check monthly limit
  if (monthlyCallCount >= MONTHLY_LIMIT) {
    return NextResponse.json(
      { error: "Monthly API limit reached" },
      { status: 429 }
    );
  }

  try {
    const now = Date.now();

    // Aggressive cache check
    if (marketDataCache) {
      const cacheAge = now - marketDataCache.timestamp;
      if (cacheAge < CACHE_DURATION) {
        const filteredData = requestSymbols.reduce<Record<string, CoinData>>(
          (acc, symbol) => {
            const key = symbol.toLowerCase();
            if (marketDataCache?.data[key]) {
              acc[key] = marketDataCache.data[key];
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
            callsRemaining: MONTHLY_LIMIT - monthlyCallCount,
          });
        }
      }
    }

    // Strict rate limiting
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      if (marketDataCache) {
        return NextResponse.json({
          data: marketDataCache.data,
          timestamp: marketDataCache.timestamp,
          fromCache: true,
          stale: true,
        });
      }
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Fetch data from CMC
    const response = await axios.get(
      `${CMC_BASE_URL}/cryptocurrency/listings/latest`,
      {
        params: {
          limit: 1000, // Increased to 1000 since credit cost is the same
          convert: "USD",
          sort: "market_cap",
          sort_dir: "desc", // Get top coins by market cap
        },
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
          Accept: "application/json",
        },
        timeout: API_TIMEOUT,
      }
    );

    lastRequestTime = now;

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      throw new Error("Invalid response from CoinMarketCap");
    }

    const marketData: CMCResponse[] = response.data.data;
    const allCoinData: Record<string, CoinData> = {};

    // If no specific symbols requested, return all coins
    if (requestSymbols.length === 0) {
      marketData.forEach((coin) => {
        const key = coin.symbol.toLowerCase();
        allCoinData[key] = {
          id: coin.slug,
          name: coin.name,
          symbol: coin.symbol,
          price: coin.quote.USD.price,
          market_cap: coin.quote.USD.market_cap,
          volume_24h: coin.quote.USD.volume_24h,
          percent_change_24h: coin.quote.USD.percent_change_24h,
          percent_change_7d: coin.quote.USD.percent_change_7d,
          percent_change_1h: coin.quote.USD.percent_change_1h,
          cmc_id: coin.id,
          rank: coin.cmc_rank,
          circulating_supply: coin.circulating_supply,
          total_supply: coin.total_supply,
          max_supply: coin.max_supply,
          market_cap_dominance: coin.quote.USD.market_cap_dominance,
          fully_diluted_market_cap: coin.quote.USD.fully_diluted_market_cap,
          image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
        };
      });
    } else {
      // Process requested symbols
      for (const symbol of requestSymbols) {
        const match = marketData.find(
          (coin) =>
            coin.symbol.toLowerCase() === symbol.toLowerCase() ||
            coin.name.toLowerCase() === symbol.toLowerCase()
        );

        if (match) {
          const key = symbol.toLowerCase();
          allCoinData[key] = {
            id: match.slug,
            name: match.name,
            symbol: match.symbol,
            price: match.quote.USD.price,
            market_cap: match.quote.USD.market_cap,
            volume_24h: match.quote.USD.volume_24h,
            percent_change_24h: match.quote.USD.percent_change_24h,
            percent_change_7d: match.quote.USD.percent_change_7d,
            percent_change_1h: match.quote.USD.percent_change_1h,
            cmc_id: match.id,
            rank: match.cmc_rank,
            circulating_supply: match.circulating_supply,
            total_supply: match.total_supply,
            max_supply: match.max_supply,
            market_cap_dominance: match.quote.USD.market_cap_dominance,
            fully_diluted_market_cap: match.quote.USD.fully_diluted_market_cap,
            image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${match.id}.png`,
          };
        }
      }
    }

    // Update cache
    marketDataCache = {
      data: allCoinData,
      timestamp: now,
    };

    return NextResponse.json({
      data: allCoinData,
      timestamp: now,
      fromCache: false,
    });
  } catch (error) {
    console.error("CoinMarketCap API Error:", error);

    // Return cache on error if available
    if (marketDataCache) {
      return NextResponse.json({
        data: marketDataCache.data,
        timestamp: marketDataCache.timestamp,
        fromCache: true,
        stale: true,
        error: "Using stale cache due to API error",
      });
    }

    return NextResponse.json(
      {
        error: "Failed to fetch market data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

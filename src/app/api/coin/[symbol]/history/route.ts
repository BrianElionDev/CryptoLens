import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Rate limiting configuration
const REQUEST_DELAY = 60000; // 60 seconds between requests
let lastRequestTime = 0;

// Cache configuration
interface HistoryData {
  date: string;
  price: number;
}

interface CacheEntry {
  data: HistoryData[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const historyCache = new Map<string, CacheEntry>();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "1";
    const { symbol } = await context.params;
    const coinId = symbol.toLowerCase();

    // Generate cache key
    const cacheKey = `${coinId}-${days}`;

    // Check cache
    const cachedData = historyCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedData.data);
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      // If cached data exists but is stale, return it instead of failing
      if (cachedData) {
        return NextResponse.json(cachedData.data);
      }
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    lastRequestTime = now;

    const response = await axios.get(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days: days,
        },
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 10000,
      }
    );

    const { data } = response;
    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error("Invalid response format from CoinGecko");
    }

    const formattedData = data.prices.map(
      ([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString(),
        price,
      })
    );

    // Update cache
    historyCache.set(cacheKey, {
      data: formattedData,
      timestamp: now,
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching coin history:", error);

    // On error, try to return cached data if available
    const { symbol } = await context.params;
    const days = request.nextUrl.searchParams.get("days") || "1";
    const cacheKey = `${symbol.toLowerCase()}-${days}`;
    const cachedData = historyCache.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData.data);
    }

    if (axios.isAxiosError(error) && error.response?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch coin history" },
      { status: 500 }
    );
  }
}

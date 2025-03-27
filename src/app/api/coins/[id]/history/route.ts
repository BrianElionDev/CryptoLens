import { NextResponse } from "next/server";

// Rate limiting configuration
const REQUEST_DELAY = 60000; // 60 seconds between requests
let lastRequestTime = 0;

// Cache configuration
interface HistoryData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CacheEntry {
  data: HistoryData[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const historyCache = new Map<string, CacheEntry>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "1";
    const coinId = resolvedParams.id.toLowerCase();

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

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        next: {
          revalidate: 60, // Cache for 1 minute
        },
      }
    );

    if (!response.ok) {
      // On error, try to return cached data if available
      if (cachedData) {
        return NextResponse.json(cachedData.data);
      }
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from CoinGecko");
    }

    // Transform the data for candlestick chart
    const transformedData: HistoryData[] = data.map(
      (item: [number, number, number, number, number]) => ({
        timestamp: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      })
    );

    // Update cache
    historyCache.set(cacheKey, {
      data: transformedData,
      timestamp: now,
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching coin history:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch coin history",
      },
      { status: 500 }
    );
  }
}

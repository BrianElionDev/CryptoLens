import { NextRequest, NextResponse } from "next/server";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 30 * 60 * 1000; // Increase cache to 30 minutes
const RATE_LIMIT_DELAY = 60 * 1000; // 1 minute

interface CachedData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CacheEntry {
  data: CachedData[];
  timestamp: number;
}

// In-memory cache for rate limiting
const rateLimitCache = new Map<string, number>();
const historyCache = new Map<string, CacheEntry>();

// Track global rate limit to prevent hitting CoinGecko limits
let lastGlobalRequest = 0;
const GLOBAL_RATE_LIMIT = 5000; // 5 seconds between any requests

function isRateLimited(id: string): boolean {
  // Check global rate limit first
  if (Date.now() - lastGlobalRequest < GLOBAL_RATE_LIMIT) {
    return true;
  }

  const lastRequest = rateLimitCache.get(id) || 0;
  return Date.now() - lastRequest < RATE_LIMIT_DELAY;
}

function getCachedData(id: string): CachedData[] | null {
  const cached = historyCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(id: string, data: CachedData[]): void {
  historyCache.set(id, {
    data,
    timestamp: Date.now(),
  });
}

// Generate simple sample data for when we're rate limited and have no cache
function generateFallbackData(days: string): CachedData[] {
  const now = Date.now();
  const numPoints = days === "1" ? 24 : days === "7" ? 7 * 24 : 30 * 24;
  const step = (parseInt(days) * 24 * 60 * 60 * 1000) / numPoints;

  // Generate some random price movement
  let price = 1000 + Math.random() * 1000;
  const result: CachedData[] = [];

  for (let i = 0; i < numPoints; i++) {
    const timestamp = now - (numPoints - i) * step;
    const change = (Math.random() - 0.5) * 0.02 * price; // 2% max change
    price += change;

    const open = price;
    const close = price + (Math.random() - 0.5) * 0.01 * price;
    const high = Math.max(open, close) + Math.random() * 0.01 * price;
    const low = Math.min(open, close) - Math.random() * 0.01 * price;

    result.push({
      timestamp,
      open,
      high,
      low,
      close,
    });
  }

  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    // Decode the URL-encoded ID
    const decodedId = decodeURIComponent(id);
    console.log("Fetching history for:", decodedId);

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "1";

    // Check cache first
    const cacheKey = `${decodedId}-${days}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log("Returning cached data for:", decodedId);
      return NextResponse.json(cachedData);
    }

    // Check rate limit
    if (isRateLimited(decodedId)) {
      console.log("Rate limit hit for:", decodedId);
      // If we have stale cached data, return it instead of error
      const staleData = historyCache.get(cacheKey);
      if (staleData) {
        console.log("Returning stale cached data for:", decodedId);
        return NextResponse.json(staleData.data);
      }

      // Generate fallback data if we have no cache
      console.log("Generating fallback data for:", decodedId);
      const fallbackData = generateFallbackData(days);
      // Cache the fallback data with a shorter expiry
      historyCache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now() - CACHE_DURATION + 5 * 60 * 1000, // Expire in 5 minutes
      });
      return NextResponse.json(fallbackData);
    }

    // Update rate limit timestamp
    rateLimitCache.set(decodedId, Date.now());
    lastGlobalRequest = Date.now();

    // Get coin data from main route to get correct CoinGecko ID
    console.log("Fetching coin data for:", decodedId);
    const coinResponse = await fetch(
      `${request.nextUrl.origin}/api/coins/${decodedId}`
    );
    if (!coinResponse.ok) {
      throw new Error(`Failed to fetch coin data: ${coinResponse.status}`);
    }
    const coinData = await coinResponse.json();
    console.log("Got coin data:", coinData.id);

    // Use CoinGecko ID from main route
    const coinGeckoId = coinData.id;

    // Fetch OHLC data from CoinGecko
    console.log("Fetching OHLC data for:", coinGeckoId);

    try {
      const response = await fetch(
        `${COINGECKO_BASE_URL}/coins/${coinGeckoId}/ohlc?vs_currency=usd&days=${days}`,
        {
          next: { revalidate: 60 }, // Cache for 1 minute
        }
      );

      if (response.status === 429) {
        console.log("CoinGecko rate limit hit, using fallback data");
        const fallbackData = generateFallbackData(days);
        setCachedData(cacheKey, fallbackData);
        return NextResponse.json(fallbackData);
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch from CoinGecko: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = data.map((item: number[]) => ({
        timestamp: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      }));

      // Cache the formatted data
      setCachedData(cacheKey, formattedData);
      console.log("Successfully fetched and cached data for:", decodedId);

      return NextResponse.json(formattedData);
    } catch (error) {
      console.error("CoinGecko API error:", error);
      // Generate fallback data on error
      const fallbackData = generateFallbackData(days);
      setCachedData(cacheKey, fallbackData);
      return NextResponse.json(fallbackData);
    }
  } catch (error) {
    console.error("Error fetching coin history:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin history" },
      { status: 500 }
    );
  }
}

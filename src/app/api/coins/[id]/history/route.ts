import { NextRequest, NextResponse } from "next/server";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
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

function isRateLimited(id: string): boolean {
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
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Update rate limit timestamp
    rateLimitCache.set(decodedId, Date.now());

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
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/${coinGeckoId}/ohlc?vs_currency=usd&days=${days}`,
      {
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

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
    console.error("Error fetching coin history:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin history" },
      { status: 500 }
    );
  }
}

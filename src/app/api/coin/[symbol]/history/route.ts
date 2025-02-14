import axios, { AxiosRequestConfig, AxiosError } from "axios";

interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface RawChartData {
  prices: unknown[];
  market_caps: unknown[];
  total_volumes: unknown[];
}

interface CacheEntry {
  data: ChartData;
  timestamp: number;
}

interface ApiResponse {
  data: ChartData;
  stale?: boolean;
}

// Validate and transform chart data
function validateChartData(data: unknown): ChartData {
  if (
    !data ||
    typeof data !== "object" ||
    !("prices" in data) ||
    !("market_caps" in data) ||
    !("total_volumes" in data)
  ) {
    throw new Error("Invalid chart data format");
  }

  const rawData = data as RawChartData;

  if (
    !Array.isArray(rawData.prices) ||
    !Array.isArray(rawData.market_caps) ||
    !Array.isArray(rawData.total_volumes)
  ) {
    throw new Error("Invalid chart data format");
  }

  // Ensure each array contains valid [timestamp, value] pairs
  const validatePairs = (pairs: unknown[]): [number, number][] => {
    return pairs.map((pair) => {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== "number" ||
        typeof pair[1] !== "number"
      ) {
        throw new Error("Invalid data point format");
      }
      return [pair[0], pair[1]];
    });
  };

  return {
    prices: validatePairs(rawData.prices),
    market_caps: validatePairs(rawData.market_caps),
    total_volumes: validatePairs(rawData.total_volumes),
  };
}

// Much longer cache duration for free API
const CACHE_DURATION = {
  "1": 15 * 60 * 1000, // 15 minutes for 1 day data
  "7": 240 * 60 * 1000, // 4 hours for 7 day data
  "30": 480 * 60 * 1000, // 8 hours for 30 day data
};

// Global request tracking - extremely conservative for CoinGecko free tier
let lastRequestTime = 0;
const REQUEST_DELAY = 30000; // 30 seconds between requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per minute
let requestsInWindow = 0;
let windowStart = Date.now();

// Keep track of rate limit state
let isRateLimited = false;
let rateLimitResetTime = 0;
let consecutiveFailures = 0;

const historyCache = new Map<string, CacheEntry>();

function getBackoffDelay() {
  // More gradual backoff: 30s, 1min, 2min, 4min
  const backoffSeconds = Math.min(
    30 * Math.pow(2, consecutiveFailures - 1),
    240
  );
  return backoffSeconds * 1000;
}

async function makeRateLimitedRequest(url: string, config: AxiosRequestConfig) {
  const now = Date.now();

  // Reset window if needed
  if (now - windowStart >= RATE_LIMIT_WINDOW) {
    windowStart = now;
    requestsInWindow = 0;
    isRateLimited = false;
    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
  }

  // Check if we've exceeded rate limit
  if (
    requestsInWindow >= MAX_REQUESTS_PER_WINDOW ||
    (isRateLimited && now < rateLimitResetTime)
  ) {
    isRateLimited = true;
    const backoffDelay = getBackoffDelay();
    rateLimitResetTime = now + backoffDelay;
    throw new Error(
      `Rate limit exceeded - Please wait ${Math.ceil(
        backoffDelay / 1000
      )} seconds`
    );
  }

  // Enforce delay between requests
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY) {
    const waitTime = REQUEST_DELAY - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  requestsInWindow++;

  try {
    const response = await axios.get(url, {
      ...config,
      timeout: 10000, // Add 10s timeout
      headers: {
        ...config.headers,
        "Accept-Encoding": "gzip,deflate,compress",
      },
    });

    if (response.status === 429) {
      throw new Error("Rate limit exceeded by CoinGecko");
    }

    const chartData = validateChartData(response.data);
    console.log("Validated Chart Data Points:", {
      prices: chartData.prices.length,
      market_caps: chartData.market_caps.length,
      total_volumes: chartData.total_volumes.length,
    });

    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
    return { data: chartData };
  } catch (error) {
    console.error("API or validation error:", error);
    if (
      error instanceof AxiosError &&
      (error.response?.status === 429 || error.code === "ECONNABORTED")
    ) {
      consecutiveFailures++;
      isRateLimited = true;
      const backoffDelay = getBackoffDelay();
      rateLimitResetTime = now + backoffDelay;
      requestsInWindow = MAX_REQUESTS_PER_WINDOW;
    }
    throw error;
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(req.url);
    const days = searchParams.get("days") || "1";
    const coinId = params.symbol.toLowerCase();

    console.log("Fetching data for:", { coinId, days });

    // Generate cache key that includes both coin and timeframe
    const cacheKey = `${coinId}-${days}`;
    const now = Date.now();
    const cached = historyCache.get(cacheKey);
    const cacheDuration =
      CACHE_DURATION[days as keyof typeof CACHE_DURATION] ||
      CACHE_DURATION["1"];

    // Return cached data if it's still valid
    if (cached && now - cached.timestamp < cacheDuration) {
      const response: ApiResponse = { data: cached.data };
      console.log("Cache stats:", {
        age: `${Math.round((now - cached.timestamp) / 1000)}s`,
        isStale: false,
        dataPoints: cached.data.prices.length,
        rateLimited: false,
      });
      return Response.json(response, { status: 200 });
    }

    // Check rate limit and return stale cache if available
    if (
      (rateLimitResetTime > now ||
        requestsInWindow >= MAX_REQUESTS_PER_WINDOW) &&
      cached
    ) {
      const response: ApiResponse = { data: cached.data, stale: true };
      console.log("Rate limited, returning stale cache:", {
        age: `${Math.round((now - cached.timestamp) / 1000)}s`,
        isStale: true,
        dataPoints: cached.data.prices.length,
        rateLimited: true,
        waitTime: Math.ceil((rateLimitResetTime - now) / 1000),
      });
      return Response.json(response, { status: 200 });
    }

    // If we're rate limited and don't have cache, wait before retrying
    if (
      rateLimitResetTime > now ||
      requestsInWindow >= MAX_REQUESTS_PER_WINDOW
    ) {
      const waitTime = Math.max(rateLimitResetTime - now, REQUEST_DELAY);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Make the API request with rate limiting
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const { data } = await makeRateLimitedRequest(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip,deflate,compress",
      },
      timeout: days === "1" ? 10000 : 30000, // Longer timeout for larger datasets
    });

    // Cache the new data
    historyCache.set(cacheKey, { data, timestamp: now });
    console.log(`Returning fresh data with points: ${data.prices.length}`);

    const response: ApiResponse = { data };
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching historical data:", error);

    try {
      // Try to return stale cache on error if available
      const params = await context.params;
      const { searchParams } = new URL(req.url);
      const cacheKey = `${params.symbol.toLowerCase()}-${
        searchParams.get("days") || "1"
      }`;
      const cached = historyCache.get(cacheKey);
      if (cached) {
        console.log("Returning stale cache after error");
        return Response.json(
          { data: cached.data, stale: true },
          { status: 200 }
        );
      }
    } catch {
      // Ignore cache recovery errors
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

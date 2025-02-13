import { NextResponse } from "next/server";
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
  "1": 8 * 60 * 60 * 1000, // 8 hours for 24h data
  "7": 24 * 60 * 60 * 1000, // 24 hours for 7d data
  "30": 48 * 60 * 60 * 1000, // 48 hours for 30d data
};

// Global request tracking - extremely conservative for CoinGecko free tier
let lastRequestTime = 0;
const REQUEST_DELAY = 60000; // 60 seconds between requests
const RATE_LIMIT_WINDOW = 300 * 1000; // 5 minute window
const MAX_REQUESTS_PER_WINDOW = 2; // Max 2 requests per 5 minutes
let requestsInWindow = 0;
let windowStart = Date.now();

// Keep track of rate limit state
let isRateLimited = false;
let rateLimitResetTime = 0;
let consecutiveFailures = 0;

// Typed cache for historical data
const historyCache = new Map<
  string,
  {
    data: ChartData;
    timestamp: number;
    staleTimestamp?: number;
  }
>();

function getBackoffDelay() {
  // More aggressive backoff: 2min, 4min, 8min, 16min, max 30min
  const backoffMinutes = Math.min(Math.pow(2, consecutiveFailures), 30);
  return backoffMinutes * 60 * 1000;
}

async function makeRateLimitedRequest(url: string, config: AxiosRequestConfig) {
  const now = Date.now();

  // Check if we're currently rate limited
  if (isRateLimited && now < rateLimitResetTime) {
    const remainingTime = Math.ceil((rateLimitResetTime - now) / 1000);
    throw new Error(
      `Rate limit exceeded - Please wait ${remainingTime} seconds`
    );
  }

  // Reset window if needed
  if (now - windowStart >= RATE_LIMIT_WINDOW) {
    windowStart = now;
    requestsInWindow = 0;
    isRateLimited = false;
    consecutiveFailures = Math.max(0, consecutiveFailures - 1); // Slowly reduce failures
  }

  // Check if we've exceeded rate limit
  if (requestsInWindow >= MAX_REQUESTS_PER_WINDOW) {
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
    await new Promise((resolve) =>
      setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  requestsInWindow++;

  try {
    const response = await axios.get(url, config);
    console.log(
      "Raw API Response:",
      JSON.stringify(response.data).slice(0, 200) + "..."
    );

    // Validate response data
    const chartData = validateChartData(response.data);
    console.log("Validated Chart Data Points:", {
      prices: chartData.prices.length,
      market_caps: chartData.market_caps.length,
      total_volumes: chartData.total_volumes.length,
    });

    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
    return { data: chartData };
  } catch (error) {
    console.error("Data validation error:", error);
    if (error instanceof AxiosError && error.response?.status === 429) {
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
  request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "1";
    const coinId = decodeURIComponent(params.symbol);

    console.log("Fetching data for:", { coinId, days });

    // Check cache first
    const cacheKey = `${coinId}-${days}`;
    const cached = historyCache.get(cacheKey);
    const now = Date.now();
    const cacheDuration =
      CACHE_DURATION[days as keyof typeof CACHE_DURATION] ||
      CACHE_DURATION["1"];

    if (cached) {
      const age = now - cached.timestamp;
      const isStale = age >= cacheDuration;

      // Log cache status
      console.log("Cache stats:", {
        age: Math.round(age / 1000) + "s",
        isStale,
        dataPoints: cached.data.prices.length,
        rateLimited: isRateLimited,
      });

      // Return cache if rate limited or fresh
      if (isRateLimited || !isStale) {
        return NextResponse.json({
          data: cached.data,
          cached: true,
          stale: isStale,
          rateLimited: isRateLimited,
          resetIn: isRateLimited
            ? Math.ceil((rateLimitResetTime - now) / 1000)
            : undefined,
        });
      }

      // Mark as stale but still try to fetch fresh data
      cached.staleTimestamp = cached.staleTimestamp || now;
    }

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const response = await makeRateLimitedRequest(url, {
      headers: {
        Accept: "application/json",
      },
    });

    const chartData = response.data;

    // Additional validation
    if (
      !chartData ||
      !Array.isArray(chartData.prices) ||
      chartData.prices.length === 0
    ) {
      console.error("Invalid or empty chart data:", chartData);
      throw new Error("No price data available");
    }

    // Log successful data
    console.log("Returning fresh data with points:", chartData.prices.length);

    // Cache the successful response
    historyCache.set(cacheKey, {
      data: chartData,
      timestamp: now,
    });

    return NextResponse.json({
      data: chartData,
      cached: false,
      dataPoints: chartData.prices.length,
      firstPoint: chartData.prices[0],
      lastPoint: chartData.prices[chartData.prices.length - 1],
    });
  } catch (error) {
    console.error("Error fetching historical data:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch historical data";

    // Try to return stale cache on error
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "1";
    const coinId = decodeURIComponent(params.symbol);
    const cached = historyCache.get(`${coinId}-${days}`);

    if (cached) {
      return NextResponse.json({
        data: cached.data,
        cached: true,
        error: errorMessage,
        stale: true,
      });
    }

    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: error instanceof AxiosError ? error.response?.status || 500 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

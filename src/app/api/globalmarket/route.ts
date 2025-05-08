import { NextResponse } from "next/server";

// Set cache revalidation time for Next.js to 5 minutes
export const revalidate = 300;

interface GlobalMarketData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_change_percentage_24h_usd: number;
  };
}

// In-memory cache
let globalDataCache: GlobalMarketData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET() {
  const currentTime = Date.now();

  // Return cached data if it's still valid
  if (globalDataCache && currentTime - lastFetchTime < CACHE_DURATION) {
    console.log("[API] Using cached global market data");
    return NextResponse.json(globalDataCache, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  }

  try {
    console.log("[API] Fetching fresh global market data");
    const response = await fetch("https://api.coingecko.com/api/v3/global", {
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      console.error(
        "[API] Failed to fetch global market data:",
        response.status,
        response.statusText
      );

      // Special handling for rate limit errors
      if (response.status === 429) {
        // Return cached data if available, even if expired
        if (globalDataCache) {
          console.log("[API] Rate limited - returning stale cache");
          return NextResponse.json(globalDataCache, {
            status: 200,
            headers: {
              "Cache-Control":
                "public, s-maxage=60, stale-while-revalidate=300",
            },
          });
        }
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }

      throw new Error(
        `API responded with ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    // Update cache
    globalDataCache = data;
    lastFetchTime = currentTime;

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching global market data:", error);

    // Return cached data if available, even if expired
    if (globalDataCache) {
      console.log("[API] Error occurred - returning stale cache");
      return NextResponse.json(globalDataCache, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch global market data" },
      { status: 500 }
    );
  }
}

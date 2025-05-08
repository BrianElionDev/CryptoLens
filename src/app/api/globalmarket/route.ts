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

// Store last successful response for fallback
let lastSuccessfulResponse: GlobalMarketData | null = null;

// Track rate limiting
let isRateLimited = false;
let rateLimitResetTime = 0;
const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute rate limit cooldown

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  const currentTime = Date.now();

  // Check if we're currently rate limited
  if (isRateLimited && currentTime < rateLimitResetTime) {
    console.log(
      "[API] Rate limited - cannot fetch global market data",
      Math.round((rateLimitResetTime - currentTime) / 1000),
      "seconds remaining"
    );

    // Return last successful response if available
    if (lastSuccessfulResponse) {
      return NextResponse.json(lastSuccessfulResponse, {
        status: 200,
      });
    }

    return NextResponse.json(
      { error: "Rate limit exceeded, please try again later" },
      { status: 429 }
    );
  }

  // Reset rate limit status if cooldown period has passed
  if (isRateLimited && currentTime >= rateLimitResetTime) {
    console.log("[API] Rate limit cooldown period complete, resetting status");
    isRateLimited = false;
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
        // Set rate limited status
        isRateLimited = true;
        rateLimitResetTime = currentTime + RATE_LIMIT_DURATION;
        console.log("[API] Rate limited - cooling down for 60 seconds");

        // Return last successful response if available
        if (lastSuccessfulResponse) {
          return NextResponse.json(lastSuccessfulResponse, {
            status: 200,
          });
        }
        return NextResponse.json(
          { error: "Rate limit exceeded, please try again later" },
          { status: 429 }
        );
      }

      throw new Error(
        `API responded with ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    // Store last successful response
    lastSuccessfulResponse = data;

    return NextResponse.json(data, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching global market data:", error);

    // Return last successful response if available
    if (lastSuccessfulResponse) {
      console.log("[API] Error occurred - returning last successful data");
      return NextResponse.json(lastSuccessfulResponse, {
        status: 200,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch global market data" },
      { status: 500 }
    );
  }
}

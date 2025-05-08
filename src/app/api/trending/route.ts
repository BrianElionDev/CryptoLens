import { NextResponse } from "next/server";

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  price_btc: number;
  score: number;
}

interface TrendingResponse {
  coins: TrendingCoin[];
}

// Store last successful response for fallback
let lastSuccessfulResponse: TrendingResponse | null = null;

// Add rate limiting tracking
let isRateLimited = false;
let rateLimitResetTime = 0;
const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute cooldown

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  const now = Date.now();

  // Check if we're currently rate limited
  if (isRateLimited && now < rateLimitResetTime) {
    console.log(
      "[API] Rate limited - cannot fetch trending data",
      Math.round((rateLimitResetTime - now) / 1000),
      "seconds remaining"
    );

    // Return last successful response if available
    if (lastSuccessfulResponse) {
      return NextResponse.json(lastSuccessfulResponse, { status: 200 });
    }

    return NextResponse.json(
      { error: "Rate limit exceeded, please try again later" },
      { status: 429 }
    );
  }

  // Reset rate limit status if cooldown period has passed
  if (isRateLimited && now >= rateLimitResetTime) {
    console.log(
      "[API] Trending rate limit cooldown period complete, resetting status"
    );
    isRateLimited = false;
  }

  try {
    console.log("[API] Fetching fresh trending data");
    const response = await fetch(
      "https://api.coingecko.com/api/v3/search/trending"
    );

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        isRateLimited = true;
        rateLimitResetTime = now + RATE_LIMIT_DURATION;
        console.log(
          "[API] Trending rate limited - cooling down for 60 seconds"
        );

        if (lastSuccessfulResponse) {
          return NextResponse.json(lastSuccessfulResponse, { status: 200 });
        }
        return NextResponse.json(
          { error: "Rate limit exceeded, please try again later" },
          { status: 429 }
        );
      }

      throw new Error(`Failed to fetch trending coins: ${response.status}`);
    }

    const data = await response.json();
    lastSuccessfulResponse = data;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching trending coins:", error);

    // Return last successful response if available
    if (lastSuccessfulResponse) {
      console.log(
        "[API] Error occurred - returning last successful trending data"
      );
      return NextResponse.json(lastSuccessfulResponse, { status: 200 });
    }

    return NextResponse.json(
      { error: "Failed to fetch trending coins" },
      { status: 500 }
    );
  }
}

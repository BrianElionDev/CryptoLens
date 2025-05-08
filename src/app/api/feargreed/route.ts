import { NextResponse } from "next/server";

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

// Store last successful response for fallback
let lastSuccessfulResponse: FearGreedData | null = null;

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
      "[API] Rate limited - cannot fetch fear/greed data",
      Math.round((rateLimitResetTime - now) / 1000),
      "seconds remaining"
    );

    // Return last successful response if available
    if (lastSuccessfulResponse) {
      return NextResponse.json(
        { data: [lastSuccessfulResponse] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Rate limit exceeded, please try again later" },
      { status: 429 }
    );
  }

  // Reset rate limit status if cooldown period has passed
  if (isRateLimited && now >= rateLimitResetTime) {
    console.log(
      "[API] Fear/greed rate limit cooldown period complete, resetting status"
    );
    isRateLimited = false;
  }

  try {
    console.log("[API] Fetching fresh fear & greed data");
    const response = await fetch("https://api.alternative.me/fng/?limit=1");

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        isRateLimited = true;
        rateLimitResetTime = now + RATE_LIMIT_DURATION;
        console.log(
          "[API] Fear/greed rate limited - cooling down for 60 seconds"
        );

        if (lastSuccessfulResponse) {
          return NextResponse.json(
            { data: [lastSuccessfulResponse] },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { error: "Rate limit exceeded, please try again later" },
          { status: 429 }
        );
      }

      throw new Error(`Failed to fetch fear & greed index: ${response.status}`);
    }

    const data = await response.json();

    // Check if we have the expected data structure
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error("Invalid fear & greed index data structure");
    }

    const fearGreedData = data.data[0];

    // Validate required fields
    if (!fearGreedData.value || !fearGreedData.value_classification) {
      console.error(
        "Missing required fields in fear & greed data:",
        fearGreedData
      );
      throw new Error("Missing required fields in fear & greed data");
    }

    // Format the data
    const formattedData = {
      value: fearGreedData.value,
      value_classification: fearGreedData.value_classification,
      timestamp: fearGreedData.timestamp || new Date().toISOString(),
    };

    lastSuccessfulResponse = formattedData;
    return NextResponse.json({ data: [formattedData] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching fear & greed index:", error);

    // Return last successful response if available
    if (lastSuccessfulResponse) {
      console.log("[API] Error occurred - returning last fear/greed data");
      return NextResponse.json(
        { data: [lastSuccessfulResponse] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch fear & greed index" },
      { status: 500 }
    );
  }
}

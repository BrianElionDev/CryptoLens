import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Rate limiting configuration
const REQUEST_DELAY = 10000; // 10 seconds between requests
let lastRequestTime = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest)
      );
    }
    lastRequestTime = now;

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "1";
    const { symbol } = await context.params;
    const coinId = symbol.toLowerCase();

    const response = await axios.get(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days: days,
        },
        headers: { Accept: "application/json" },
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

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching coin history:", error);
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

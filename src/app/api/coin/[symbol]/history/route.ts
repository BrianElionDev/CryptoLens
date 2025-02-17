import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Rate limiting configuration
let lastRequestTime = 0;

export async function GET(
  request: NextRequest,
  context: { params: { symbol: string } }
) {
  try {
    const params = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "1"; // Default to 24h (1 day)

    // Enforce delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < 30000) {
      // 30 seconds minimum between requests
      await new Promise((resolve) =>
        setTimeout(resolve, 30000 - timeSinceLastRequest)
      );
    }
    lastRequestTime = Date.now();

    // The symbol parameter should already be a valid CoinGecko ID from the frontend
    const coinId = params.symbol.toLowerCase(); // Ensure lowercase for consistency
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days: days,
        },
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
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

    return NextResponse.json({ data: formattedData });
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

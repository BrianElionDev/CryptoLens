import { NextResponse } from "next/server";

interface GlobalMarketData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_change_percentage_24h_usd: number;
  };
}

let cache: GlobalMarketData | null = null;
let cacheTime = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export async function GET() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cache, { status: 200 });
  }

  try {
    const response = await fetch("https://api.coingecko.com/api/v3/global");
    if (!response.ok) {
      throw new Error("Failed to fetch global market data");
    }
    const data = await response.json();

    cache = data;
    cacheTime = now;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching global market data:", error);
    return NextResponse.json(
      { error: "Failed to fetch global market data" },
      { status: 500 }
    );
  }
}

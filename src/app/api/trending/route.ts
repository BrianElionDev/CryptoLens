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

let cache: TrendingResponse | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cache, { status: 200 });
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/search/trending"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch trending coins");
    }
    const data = await response.json();
    cache = data;
    cacheTime = now;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching trending coins:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending coins" },
      { status: 500 }
    );
  }
}

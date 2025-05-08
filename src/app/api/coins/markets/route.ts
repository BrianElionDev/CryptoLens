import { NextResponse } from "next/server";
import axios from "axios";

// Cache for 5 minutes
export const revalidate = 300;

interface CoinGeckoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_1h: number;
  market_cap_rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  market_cap_change_percentage_24h: number;
  fully_diluted_valuation: number;
  image: string;
}

// In-memory cache with timestamp
let cachedData: { data: CoinGeckoData[]; timestamp: number } | null = null;

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if it's less than 5 minutes old
    if (cachedData && now - cachedData.timestamp < 5 * 60 * 1000) {
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ETag: `"${cachedData.timestamp}"`,
        },
      });
    }

    console.log("Fetching coin market data...");
    // Fetch all pages in parallel
    const perPage = 250;
    const totalPages = 3;
    const pagePromises = Array.from({ length: totalPages }, (_, i) =>
      axios.get("https://api.coingecko.com/api/v3/coins/markets", {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: perPage,
          page: i + 1,
          sparkline: false,
        },
        timeout: 10000,
      })
    );

    const responses = await Promise.all(pagePromises);
    const allCoins = responses.flatMap((response) => response.data);

    // Update cache
    cachedData = { data: allCoins, timestamp: now };

    return NextResponse.json(allCoins, {
      headers: {
        "Cache-Control": "public, max-age=300",
        ETag: `"${now}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching coins:", error);

    // Return cached data if available, even if stale
    if (cachedData) {
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ETag: `"${cachedData.timestamp}"`,
        },
      });
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.error || "Failed to fetch coin data";
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
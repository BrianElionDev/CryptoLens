import { NextResponse } from "next/server";
import axios, { AxiosResponse } from "axios";

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
    if (cachedData && now - cachedData.timestamp < 1 * 60 * 1000) {
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
    const totalPages = 4;
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
        headers: {
          // Add standard headers to reduce chance of being rate-limited
          Accept: "application/json",
          "User-Agent": "CryptoLens/1.0",
        },
      })
    );

    // Use allSettled instead of all to handle partial failures
    const responses = await Promise.allSettled(pagePromises);

    // Extract successful responses
    const allCoins = responses
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<AxiosResponse<CoinGeckoData[]>> =>
          result.status === "fulfilled"
      )
      .flatMap((result) => result.value.data);

    // If we got no data but have cache, use the expired cache
    if (allCoins.length === 0 && cachedData) {
      console.log("API returned no data - using expired cache");
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, max-age=60",
          ETag: `"${cachedData.timestamp}"`,
          "X-Cache-Status": "expired-fallback",
        },
      });
    }

    // Only update cache if we got data
    if (allCoins.length > 0) {
      cachedData = { data: allCoins, timestamp: now };
    }

    return NextResponse.json(allCoins, {
      headers: {
        "Cache-Control": "public, max-age=300",
        ETag: `"${now}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching coin market data:", error);

    // Fallback to cache if available when API fails
    if (cachedData) {
      console.log("Using cached data due to API error");
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, max-age=60",
          "X-Cache-Status": "error-fallback",
        },
      });
    }

    // Return empty array if no cache available
    return NextResponse.json([], {
      status: 200,
      headers: {
        "X-Error": "Failed to fetch market data",
      },
    });
  }
}

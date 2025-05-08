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

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // Sequential fetching with rate limiting
    const perPage = 250;
    const pages = 3;
    let allCoins: CoinGeckoData[] = [];

    for (let i = 0; i < pages; i++) {
      try {
        // Make request
        const response = await axios.get(
          "https://api.coingecko.com/api/v3/coins/markets",
          {
            params: {
              vs_currency: "usd",
              order: "market_cap_desc",
              per_page: perPage,
              page: i + 1,
              sparkline: false,
            },
            timeout: 10000,
            headers: {
              Accept: "application/json",
              "User-Agent": "CryptoLens App",
            },
          }
        );

        // Add data to our collection
        allCoins = [...allCoins, ...response.data];

        // Wait 2 seconds between requests to avoid rate limiting
        if (i < pages - 1) {
          await delay(2000);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log(
            "Rate limit reached, waiting 5 seconds before retrying..."
          );
          await delay(5000); // Wait 5 seconds on rate limit
          i--; // Retry the same page
        } else {
          // For other errors, log and continue with what we have
          console.error(`Error fetching page ${i + 1}:`, error);
          // If we have no data at all and hit an error on first page, we'll rethrow later
          if (i > 0) {
            break; // We have some data, so break the loop and use what we have
          }
        }
      }
    }

    // If we got some data, update cache and return
    if (allCoins.length > 0) {
      // Update cache
      cachedData = { data: allCoins, timestamp: now };

      return NextResponse.json(allCoins, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ETag: `"${now}"`,
        },
      });
    }

    // If we got no data at all but have old cache, return that
    if (cachedData) {
      console.log("Using stale cache due to API errors");
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ETag: `"${cachedData.timestamp}"`,
          "X-Data-Source": "stale-cache",
        },
      });
    }

    // No data at all, throw error
    throw new Error("Failed to fetch any coin data");
  } catch (error) {
    console.error("Error fetching coins:", error);

    // Return cached data if available, even if stale
    if (cachedData) {
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ETag: `"${cachedData.timestamp}"`,
          "X-Data-Source": "stale-cache-error-fallback",
        },
      });
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message =
        error.response?.status === 429
          ? "Rate limit exceeded. Please try again later."
          : error.response?.data?.error || "Failed to fetch coin data";
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

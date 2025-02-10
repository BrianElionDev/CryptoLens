import { NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const API_TIMEOUT = 30000;

interface CategoryData {
  id: string;
  name: string;
  market_cap: number;
  volume_24h: number;
  top_3_coins: string[];
}

interface CoinGeckoCategoryResponse {
  id: string;
  name: string;
  market_cap: number;
  volume_24h: number;
  top_3_coins: string[];
}

// Cache for category data
interface CategoryCache {
  data: CategoryData[];
  timestamp: number;
}

let categoryCache: CategoryCache | null = null;

export async function GET() {
  try {
    // Check if we have fresh cache (less than 30 minutes old)
    if (
      categoryCache &&
      Date.now() - categoryCache.timestamp < 30 * 60 * 1000
    ) {
      return NextResponse.json({
        data: categoryCache.data,
        timestamp: categoryCache.timestamp,
        isFresh: false,
      });
    }

    // Get category data
    const categoryResponse = await axios.get(
      `${COINGECKO_BASE_URL}/coins/categories`,
      {
        params: {
          order: "market_cap_desc",
        },
        timeout: API_TIMEOUT,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!categoryResponse.data) {
      throw new Error("No category data received from CoinGecko");
    }

    const timestamp = Date.now();
    const freshData = categoryResponse.data.map(
      (cat: CoinGeckoCategoryResponse) => ({
        id: cat.id,
        name: cat.name,
        market_cap: cat.market_cap || 0,
        volume_24h: cat.volume_24h || 0,
        top_3_coins: cat.top_3_coins || [],
      })
    );

    categoryCache = {
      data: freshData,
      timestamp,
    };

    return NextResponse.json({
      data: freshData,
      timestamp,
      isFresh: true,
    });
  } catch (error: unknown) {
    // Return cached data if available
    if (categoryCache) {
      return NextResponse.json({
        data: categoryCache.data,
        timestamp: categoryCache.timestamp,
        isFresh: false,
      });
    }

    // If it's a rate limit error, provide a specific message
    const axiosError = error as { response?: { status: number } };
    if (axiosError?.response?.status === 429) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded, please try again later",
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch category data", timestamp: Date.now() },
      { status: 500 }
    );
  }
}

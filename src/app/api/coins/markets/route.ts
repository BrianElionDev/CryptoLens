import { NextResponse } from "next/server";
import axios from "axios";

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

export async function GET() {
  try {
    // Fetch all 750 coins in one request
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets",
      {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 750,
          page: 1,
          sparkline: false,
        },
      }
    );

    const coingeckoData = response.data as CoinGeckoData[];

    // Return just the CoinGecko data - CMC data will be merged client-side
    return NextResponse.json(coingeckoData);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: "Failed to fetch coin data" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

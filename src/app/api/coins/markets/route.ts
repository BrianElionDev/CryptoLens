import { NextResponse } from "next/server";

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
let cache: CoinGeckoData[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cache, { status: 200 });
  }

  try {
    // Batch the requests in smaller chunks to avoid rate limits
    const BATCH_SIZE = 50;
    const symbols: string[] = [
      /* your symbols array */
    ];
    const batches = [];

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      batches.push(symbols.slice(i, i + BATCH_SIZE));
    }

    const allCoins = [];
    for (const batch of batches) {
      const pagePromises = batch.map((symbol) =>
        fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${symbol}&order=market_cap_desc&per_page=1&page=1&sparkline=false`
        )
      );

      const responses = await Promise.all(pagePromises);
      const batchCoins = await Promise.all(responses.map((r) => r.json()));
      allCoins.push(...batchCoins.flat());

      // Add a small delay between batches to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    cache = allCoins;
    cacheTime = now;
    return NextResponse.json(allCoins, { status: 200 });
  } catch (err) {
    console.error("Error fetching coins:", err);
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}

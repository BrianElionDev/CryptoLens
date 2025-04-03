import type { CoinData } from "@/hooks/useCoinData";

interface ApiResponse {
  data: Record<string, unknown>;
  fromCMC?: boolean;
  fromCache?: boolean;
}

interface NormalizedCoinData extends CoinData {
  [key: string]: unknown;
}

export async function fetchCryptoData(symbols: string[]): Promise<ApiResponse> {
  try {
    console.log("Fetching data for symbols:", symbols);

    // Try CoinGecko first
    const geckoResponse = await fetch("/api/coingecko", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbols, mode: "quick" }),
    });

    if (geckoResponse.ok) {
      const geckoData = await geckoResponse.json();
      const foundSymbols = new Set(
        Object.keys(geckoData.data).map((s) => s.toLowerCase())
      );
      const missingSymbols = symbols.filter(
        (s) => !foundSymbols.has(s.toLowerCase())
      );

      console.log("CoinGecko found symbols:", Array.from(foundSymbols));
      console.log("Missing symbols to try with CMC:", missingSymbols);

      // If all symbols found in CoinGecko, return the data
      if (missingSymbols.length === 0) {
        return geckoData;
      }

      // Try CMC for missing symbols
      console.log("Trying CMC for missing symbols");
      const cmcResponse = await fetch("/api/coinmarketcap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols: missingSymbols,
          fallbackMode: true,
          reason: "Symbols not found in CoinGecko",
        }),
      });

      if (cmcResponse.ok) {
        const cmcData = await cmcResponse.json();
        console.log("CMC found data:", Object.keys(cmcData.data));
        // Merge data from both APIs
        return {
          data: { ...geckoData.data, ...cmcData.data },
          fromCache: geckoData.fromCache || cmcData.fromCache,
          fromCMC: true,
        };
      }
    }

    // If CoinGecko completely fails, try CMC as full fallback
    const cmcResponse = await fetch("/api/coinmarketcap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbols,
        fallbackMode: true,
        reason: "CoinGecko API failure",
      }),
    });

    if (cmcResponse.ok) {
      return await cmcResponse.json();
    }

    throw new Error("Both APIs failed");
  } catch (error) {
    console.error("Crypto API Error:", error);
    throw error;
  }
}

// Helper to normalize data from both APIs
export function normalizeCryptoData(
  data: Record<string, unknown>,
  source: string
): CoinData[] {
  if (source === "coingecko") {
    return data as unknown as CoinData[];
  }

  // Transform CMC data to match CoinGecko format
  const normalized: Record<string, NormalizedCoinData> = {};

  Object.entries(data).forEach(([key, value]) => {
    const coinData = value as Record<string, unknown>;
    normalized[key] = {
      id: coinData.id as string,
      name: coinData.name as string,
      symbol: coinData.symbol as string,
      image: coinData.image as string,
      market_cap: coinData.market_cap as number,
      market_cap_rank: coinData.market_cap_rank as number,
      fully_diluted_valuation: coinData.fully_diluted_valuation as number,
      total_volume: coinData.total_volume as number,
      high_24h: coinData.high_24h as number,
      low_24h: coinData.low_24h as number,
      price_change_24h: coinData.price_change_24h as number,
      market_cap_change_24h: coinData.market_cap_change_24h as number,
      market_cap_change_percentage_24h:
        coinData.market_cap_change_percentage_24h as number,
      circulating_supply: coinData.circulating_supply as number,
      total_supply: coinData.total_supply as number,
      max_supply: coinData.max_supply as number,
      ath: coinData.ath as number,
      ath_change_percentage: coinData.ath_change_percentage as number,
      ath_date: coinData.ath_date as string,
      atl: coinData.atl as number,
      atl_change_percentage: coinData.atl_change_percentage as number,
      atl_date: coinData.atl_date as string,
      roi: coinData.roi as null,
      last_updated: coinData.last_updated as string,
      coingecko_id: coinData.id as string,
      price_change_percentage_24h: coinData.percent_change_24h as number,
      current_price: coinData.price as number,
    } as NormalizedCoinData;
  });

  return Object.values(normalized);
}

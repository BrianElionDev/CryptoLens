import { NextRequest, NextResponse } from "next/server";

interface CoinGeckoListItem {
  id: string;
  symbol: string;
  name: string;
}

interface CoinGeckoMarketData {
  current_price: {
    usd: number;
  };
  market_cap: {
    usd: number;
  };
  total_volume: {
    usd: number;
  };
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_1h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  fully_diluted_valuation: {
    usd: number | null;
  };
}

interface CoinGeckoResponse {
  id: string;
  symbol: string;
  name: string;
  categories: string[];
  description: {
    en: string;
  };
  market_data: CoinGeckoMarketData;
  image: {
    large: string;
    small: string;
    thumb: string;
  };
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    // Decode the URL-encoded ID
    const decodedId = decodeURIComponent(id);
    const CMC_API_KEY = "853e5b5f-2819-49d3-a732-aa2616398d6d";
    const CMC_API = "https://pro-api.coinmarketcap.com/v1";
    const COINGECKO_API = "https://api.coingecko.com/api/v3";

    // Check if it's a CMC ID (format: cmc-123)
    const isCMC = decodedId.startsWith("cmc-");
    const cleanId = isCMC ? decodedId.replace("cmc-", "") : decodedId;

    if (isCMC && CMC_API_KEY) {
      try {
        const response = await fetch(
          `${CMC_API}/cryptocurrency/quotes/latest?id=${cleanId}`,
          {
            headers: {
              "X-CMC_PRO_API_KEY": CMC_API_KEY,
              Accept: "application/json",
            },
            next: { revalidate: 900 }, // Cache for 15 minutes
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch from CMC: ${response.status}`);
        }

        const data = await response.json();
        const coin = data.data[cleanId];

        if (!coin) {
          throw new Error("Coin not found in CMC response");
        }

        // Try to get metadata (optional)
        let description = "";
        let tags = [];

        try {
          const metaResponse = await fetch(
            `${CMC_API}/cryptocurrency/info?id=${cleanId}`,
            {
              headers: {
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
                Accept: "application/json",
              },
              next: { revalidate: 86400 }, // Cache for 24 hours
            }
          );

          if (metaResponse.ok) {
            const metaData = await metaResponse.json();
            const meta = metaData.data?.[cleanId];
            if (meta) {
              description = meta.description || "";
              tags = meta.tags || [];
              if (meta.category && !tags.includes(meta.category)) {
                tags.unshift(meta.category);
              }
            }
          }
        } catch {
          console.warn("Metadata fetch failed, continuing with basic data");
        }

        // Get CoinGecko ID from symbol
        const symbol = coin.symbol.toLowerCase();
        const coinGeckoResponse = await fetch(
          `${COINGECKO_API}/coins/list?include_platform=false`
        );
        const coinGeckoData =
          (await coinGeckoResponse.json()) as CoinGeckoListItem[];
        const coinGeckoCoin = coinGeckoData.find(
          (c) => c.symbol.toLowerCase() === symbol
        );

        if (!coinGeckoCoin) {
          throw new Error("Coin not found in CoinGecko");
        }

        return NextResponse.json({
          id: coinGeckoCoin.id, // Use CoinGecko ID
          symbol: coin.symbol.toLowerCase(),
          name: coin.name,
          cmc_id: coin.id,
          categories: tags,
          description: { en: description },
          market_data: {
            current_price: {
              usd: coin.quote.USD.price,
            },
            market_cap: {
              usd: coin.quote.USD.market_cap,
            },
            total_volume: {
              usd: coin.quote.USD.volume_24h,
            },
            price_change_percentage_24h: coin.quote.USD.percent_change_24h,
            price_change_percentage_7d: coin.quote.USD.percent_change_7d,
            price_change_percentage_1h: coin.quote.USD.percent_change_1h,
            circulating_supply: coin.circulating_supply,
            total_supply: coin.total_supply,
            max_supply: coin.max_supply,
            fully_diluted_valuation: {
              usd:
                coin.max_supply && coin.max_supply > 0
                  ? coin.quote.USD.price * coin.max_supply
                  : coin.quote.USD.market_cap,
            },
          },
          image: {
            large: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
            small: `https://s2.coinmarketcap.com/static/img/coins/32x32/${coin.id}.png`,
            thumb: `https://s2.coinmarketcap.com/static/img/coins/16x16/${coin.id}.png`,
          },
          sentiment_votes_up_percentage: 0,
          sentiment_votes_down_percentage: 0,
          data_source: "cmc",
        });
      } catch (cmcError) {
        console.error("CMC API error:", cmcError);
        // Fall through to CoinGecko
      }
    }

    // Fallback to CoinGecko
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        // First get the coin list to find the correct ID
        const coinListResponse = await fetch(
          `${COINGECKO_API}/coins/list?include_platform=false`,
          {
            next: { revalidate: 3600 }, // Cache for 1 hour
          }
        );

        if (!coinListResponse.ok) {
          throw new Error(
            `Failed to fetch coin list: ${coinListResponse.status}`
          );
        }

        const coinList = (await coinListResponse.json()) as CoinGeckoListItem[];

        // First try to find exact match by ID, which is more reliable
        let coinGeckoCoin = coinList.find(
          (c) => c.id.toLowerCase() === cleanId.toLowerCase()
        );

        // Well-known coins mapping to ensure we get the main coin
        const wellKnownCoins: Record<string, string> = {
          bitcoin: "bitcoin",
          btc: "bitcoin",
          ethereum: "ethereum",
          eth: "ethereum",
          tether: "tether",
          usdt: "tether",
        };

        // Check if we have a well-known match
        if (!coinGeckoCoin && wellKnownCoins[cleanId.toLowerCase()]) {
          const wellKnownId = wellKnownCoins[cleanId.toLowerCase()];
          coinGeckoCoin = coinList.find(
            (c) => c.id.toLowerCase() === wellKnownId
          );
        }

        // If not found by ID, try to find by symbol
        if (!coinGeckoCoin) {
          // For symbols, we need to be more careful as many coins can have the same symbol
          const symbolMatches = coinList.filter(
            (c) => c.symbol.toLowerCase() === cleanId.toLowerCase()
          );

          if (symbolMatches.length > 0) {
            // Prioritize main coins (shorter IDs are usually the main coins)
            symbolMatches.sort((a, b) => a.id.length - b.id.length);
            coinGeckoCoin = symbolMatches[0];
          }
        }

        // If still not found, try by name
        if (!coinGeckoCoin) {
          coinGeckoCoin = coinList.find(
            (c) => c.name.toLowerCase() === cleanId.toLowerCase()
          );
        }

        if (!coinGeckoCoin) {
          throw new Error("Coin not found in CoinGecko");
        }

        // Now fetch the detailed data using the correct ID
        const response = await fetch(
          `${COINGECKO_API}/coins/${coinGeckoCoin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
          {
            next: { revalidate: 60 }, // Cache for 1 minute
          }
        );

        if (response.status === 429) {
          // Rate limit hit, wait and retry
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (4 - retries))
          );
          retries--;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch from CoinGecko: ${response.status}`);
        }

        const data = (await response.json()) as CoinGeckoResponse;
        return NextResponse.json({
          ...data,
          market_data: {
            ...data.market_data,
            fully_diluted_valuation: {
              usd: data.market_data.fully_diluted_valuation?.usd ?? null,
            },
          },
          data_source: "coingecko",
        });
      } catch (error) {
        lastError = error as Error;
        retries--;
        if (retries > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (4 - retries))
          );
        }
      }
    }

    // If all attempts fail, throw the last error
    throw lastError || new Error("Failed to fetch coin data from all sources");
  } catch (error) {
    console.error("Error fetching coin data:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}

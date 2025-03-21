import { NextResponse } from "next/server";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CMC_API = "https://pro-api.coinmarketcap.com/v1";
const CMC_API_KEY = process.env.CMC_API_KEY;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json(
        { error: "Invalid coin ID provided" },
        { status: 400 }
      );
    }

    const coinId = id.toLowerCase();

    // Try CoinGecko first
    try {
      const geckoRes = await fetch(`${COINGECKO_API}/coins/${coinId}`, {
        next: { revalidate: 60 }, // Cache for 1 minute
        headers: {
          Accept: "application/json",
        },
      });

      if (geckoRes.ok) {
        const data = await geckoRes.json();
        return NextResponse.json({ ...data, source: "coingecko" });
      }
    } catch (geckoError) {
      console.warn("CoinGecko API error:", geckoError);
    }

    // If CoinGecko fails, try CMC as fallback
    if (CMC_API_KEY) {
      try {
        // First get coin ID mapping from slug
        const mappingRes = await fetch(
          `${CMC_API}/cryptocurrency/info?slug=${coinId}`,
          {
            headers: {
              "X-CMC_PRO_API_KEY": CMC_API_KEY,
              Accept: "application/json",
            },
          }
        );

        if (mappingRes.ok) {
          const mappingData = await mappingRes.json();
          const coinId = Object.keys(mappingData.data)[0];

          if (coinId) {
            const cmcRes = await fetch(
              `${CMC_API}/cryptocurrency/quotes/latest?id=${coinId}`,
              {
                headers: {
                  "X-CMC_PRO_API_KEY": CMC_API_KEY,
                  Accept: "application/json",
                },
              }
            );

            if (cmcRes.ok) {
              const cmcData = await cmcRes.json();
              const coin = cmcData.data[coinId];

              // Transform CMC data to match CoinGecko format
              return NextResponse.json({
                id: coin.slug,
                symbol: coin.symbol.toLowerCase(),
                name: coin.name,
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
                  price_change_percentage_24h:
                    coin.quote.USD.percent_change_24h,
                  price_change_percentage_7d: coin.quote.USD.percent_change_7d,
                  price_change_percentage_1h: coin.quote.USD.percent_change_1h,
                },
                image: {
                  large: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`,
                  small: `https://s2.coinmarketcap.com/static/img/coins/32x32/${coinId}.png`,
                  thumb: `https://s2.coinmarketcap.com/static/img/coins/16x16/${coinId}.png`,
                },
                source: "cmc",
              });
            }
          }
        }
      } catch (cmcError) {
        console.error("CMC API error:", cmcError);
      }
    }

    // If both APIs fail
    return NextResponse.json(
      { error: "Failed to fetch coin data from both APIs" },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error fetching coin:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}

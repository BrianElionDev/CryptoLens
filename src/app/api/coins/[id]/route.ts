import { NextResponse } from "next/server";
import axios from "axios";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CMC_API = "https://pro-api.coinmarketcap.com/v1";
const CMC_API_KEY = process.env.CMC_API_KEY;

// Disable Next.js optimizations that cause params validation errors
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Safely destructure params to avoid the Next.js error
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const coinId = id.toLowerCase();

    // Validate ID
    if (!coinId || coinId === "undefined" || coinId === "null") {
      return NextResponse.json(
        { error: "Invalid coin ID provided" },
        { status: 400 }
      );
    }

    console.log(
      `Fetching coin data for ID: ${coinId}, Source: ${source || "auto"}`
    );

    // If source is explicitly set to CMC, go directly to CMC
    if (source === "cmc") {
      if (!CMC_API_KEY) {
        return NextResponse.json(
          { error: "CMC API key not configured" },
          { status: 500 }
        );
      }

      try {
        // Use Axios for better timeout handling
        const response = await axios.get(
          `${CMC_API}/cryptocurrency/quotes/latest`,
          {
            params: { id: coinId },
            headers: {
              "X-CMC_PRO_API_KEY": CMC_API_KEY,
              Accept: "application/json",
            },
            timeout: 20000, // 20 second timeout
          }
        );

        if (!response.data?.data?.[coinId]) {
          return NextResponse.json(
            { error: "Coin not found in CMC response" },
            { status: 404 }
          );
        }

        const coin = response.data.data[coinId];

        // Transform CMC data to match CoinGecko format
        return NextResponse.json({
          id: coin.slug,
          symbol: coin.symbol.toLowerCase(),
          name: coin.name,
          cmc_id: coin.id,
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
          },
          image: {
            large: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
            small: `https://s2.coinmarketcap.com/static/img/coins/32x32/${coin.id}.png`,
            thumb: `https://s2.coinmarketcap.com/static/img/coins/16x16/${coin.id}.png`,
          },
          data_source: "cmc",
        });
      } catch (error) {
        console.error("CMC API Error:", error);
        return NextResponse.json(
          { error: "Failed to fetch coin data from CMC" },
          { status: 503 }
        );
      }
    }

    // Otherwise try CoinGecko first
    try {
      const response = await axios.get(`${COINGECKO_API}/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
        },
        headers: {
          Accept: "application/json",
        },
        timeout: 8000, // 8 second timeout
      });

      return NextResponse.json({
        ...response.data,
        data_source: "coingecko",
      });
    } catch (geckoError) {
      console.warn("CoinGecko API error:", geckoError);
    }

    // If CoinGecko fails, try CMC as fallback
    if (CMC_API_KEY) {
      try {
        // First get coin ID mapping from slug
        const mappingResponse = await axios.get(
          `${CMC_API}/cryptocurrency/info`,
          {
            params: { slug: coinId },
            headers: {
              "X-CMC_PRO_API_KEY": CMC_API_KEY,
              Accept: "application/json",
            },
            timeout: 20000, // Increase timeout
          }
        );

        const mappingData = mappingResponse.data?.data;
        if (!mappingData || Object.keys(mappingData).length === 0) {
          return NextResponse.json(
            { error: "Coin not found in CMC database" },
            { status: 404 }
          );
        }

        const cmcId = Object.keys(mappingData)[0];

        const cmcResponse = await axios.get(
          `${CMC_API}/cryptocurrency/quotes/latest`,
          {
            params: { id: cmcId },
            headers: {
              "X-CMC_PRO_API_KEY": CMC_API_KEY,
              Accept: "application/json",
            },
            timeout: 20000, // Increase timeout
          }
        );

        const cmcData = cmcResponse.data?.data;
        if (!cmcData || !cmcData[cmcId]) {
          return NextResponse.json(
            { error: "Coin data not found in CMC response" },
            { status: 404 }
          );
        }

        const coin = cmcData[cmcId];

        // Transform CMC data to match CoinGecko format
        return NextResponse.json({
          id: coin.slug,
          symbol: coin.symbol.toLowerCase(),
          name: coin.name,
          cmc_id: coin.id,
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
          },
          image: {
            large: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
            small: `https://s2.coinmarketcap.com/static/img/coins/32x32/${coin.id}.png`,
            thumb: `https://s2.coinmarketcap.com/static/img/coins/16x16/${coin.id}.png`,
          },
          data_source: "cmc",
        });
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

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "1";

    // Add a small delay to handle rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${resolvedParams.id}/ohlc?vs_currency=usd&days=${days}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        next: {
          revalidate: 60, // Cache for 1 minute
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from CoinGecko");
    }

    // Transform the data for candlestick chart
    const transformedData = data.map(
      (item: [number, number, number, number, number]) => ({
        timestamp: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      })
    );

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching coin history:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch coin history",
      },
      { status: 500 }
    );
  }
}

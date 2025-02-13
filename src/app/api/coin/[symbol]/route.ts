import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  const params = await context.params;
  const coinId = decodeURIComponent(params.symbol);

  if (!coinId) {
    return NextResponse.json({ error: "Coin ID is required" }, { status: 400 });
  }

  try {
    // Use absolute URL for axios
    const baseUrl = request.headers.get("host") || "";
    const protocol = baseUrl.includes("localhost") ? "http" : "https";

    const response = await axios.post(
      `${protocol}://${baseUrl}/api/coingecko`,
      {
        symbols: [coinId],
        forceRefresh: true,
        t: Date.now(),
      }
    );

    if (!response.data?.data || !response.data.data[coinId]) {
      return NextResponse.json(
        { error: "Coin data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: response.data.data[coinId] });
  } catch (error) {
    console.error("Error fetching coin data:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}

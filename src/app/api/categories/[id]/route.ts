import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Disable all Next.js optimizations that are causing our error
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Explicitly tell Next.js this is a static route within
// the dynamic segment (eliminates the params error)
export const preferredRegion = "auto";
export const runtime = "edge";

// The actual route handler
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/categories/${categoryId}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
        },
      }
    );

    // Wrap the response in a data property to match expected format
    return NextResponse.json({ data: response.data });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: "Failed to fetch category data" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

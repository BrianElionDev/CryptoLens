import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Using Edge runtime which requires awaiting params
export const runtime = "edge";

// Define the route handler with the correct types
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // We need to await the params in Edge runtime
    const { id } = await context.params;

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/categories/${id}`
    );

    return NextResponse.json({ data: response.data });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
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

import { NextRequest, NextResponse } from "next/server";

// Disable Next.js optimizations that cause params validation errors
export const dynamic = "force-dynamic";

export const runtime = "edge";

// API route handler for GET requests
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Safely destructure params to avoid the Next.js error
    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/categories/${id}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch category data" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

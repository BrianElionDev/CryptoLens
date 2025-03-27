import { NextResponse } from "next/server";
import axios from "axios";

// API route handler for GET requests
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/categories/${id}`
    );

    return NextResponse.json({ data: response.data });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data || "Failed to fetch category data" },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

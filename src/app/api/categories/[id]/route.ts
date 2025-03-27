import { NextResponse } from "next/server";
import axios from "axios";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = await context.params; // Ensure params is awaited

    if (!params?.id) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const categoryId = params.id;

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/categories/${categoryId}`
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

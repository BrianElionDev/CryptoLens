import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Path parameter is required" },
      { status: 400 }
    );
  }

  // Revalidate the path
  revalidateTag("knowledge");

  return NextResponse.json({
    revalidated: true,
    now: Date.now(),
  });
}

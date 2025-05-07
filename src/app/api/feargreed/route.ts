import { NextResponse } from "next/server";

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

let cache: FearGreedData | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json({ data: [cache] }, { status: 200 });
  }

  try {
    const response = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!response.ok) {
      throw new Error("Failed to fetch fear & greed index");
    }
    const data = await response.json();

    // Check if we have the expected data structure
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error("Invalid fear & greed index data structure");
    }

    const fearGreedData = data.data[0];

    // Validate required fields
    if (!fearGreedData.value || !fearGreedData.value_classification) {
      console.error(
        "Missing required fields in fear & greed data:",
        fearGreedData
      );
      throw new Error("Missing required fields in fear & greed data");
    }

    // Format the data
    const formattedData = {
      value: fearGreedData.value,
      value_classification: fearGreedData.value_classification,
      timestamp: fearGreedData.timestamp || new Date().toISOString(),
    };

    cache = formattedData;
    cacheTime = now;
    return NextResponse.json({ data: [formattedData] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching fear & greed index:", error);
    return NextResponse.json(
      { error: "Failed to fetch fear & greed index" },
      { status: 500 }
    );
  }
}

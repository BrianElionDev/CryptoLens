import { NextResponse } from "next/server";
import { getNextBatch, initServerBatchFetching } from "@/lib/server/prefetch";

// This route is optimized to use the server's in-memory cache
// instead of making new database queries for each request

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const batchIndex = parseInt(url.searchParams.get("batch") || "0", 10);
    const init = url.searchParams.get("init") === "true";

    console.log(
      `Knowledge batch API: ${
        init ? "Initializing" : `Fetching batch ${batchIndex}`
      }`
    );

    let result;

    if (init) {
      // Initialize and get first batch
      result = await initServerBatchFetching();
      console.log(
        `Initialized server batches, first batch has ${result.firstBatch.length} items`
      );

      return NextResponse.json({
        batch: result.firstBatch,
        batchIndex: 0,
        totalFetched: result.totalFetched,
        hasMore: result.firstBatch.length === 200, // Assuming batch size is 200
      });
    } else {
      // Get specific batch - calculate offset based on batch index
      const BATCH_SIZE = 200;
      const offset = batchIndex * BATCH_SIZE;

      console.log(`Getting batch at proper offset: ${offset}`);
      result = await getNextBatch(batchIndex);
      console.log(
        `Retrieved batch ${batchIndex} with ${result.batch.length} items (offset ${offset})`
      );

      // Add batch index to each item for debugging
      const batchWithIndices = result.batch.map((item) => ({
        ...item,
        _batchIndex: batchIndex,
      }));

      return NextResponse.json({
        batch: batchWithIndices,
        batchIndex,
        totalFetched: result.totalFetched,
        hasMore: result.batch.length === 200, // Assuming batch size is 200
      });
    }
  } catch (error) {
    console.error("Error in knowledge batch API:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge batch" },
      { status: 500 }
    );
  }
}

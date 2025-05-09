import { createClient } from "@supabase/supabase-js";
import type { KnowledgeItem } from "@/types/knowledge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache to hold batches between server requests
let dataCache: {
  timestamp: number;
  batches: Map<number, KnowledgeItem[]>;
  isFetching: boolean;
  totalFetched: number;
} | null = null;

const CACHE_TTL = 1000 * 60 * 15; // 15 minutes
// BATCH_SIZE is used as a constant for range calculations
const BATCH_SIZE = 200;

/**
 * Gets the total count of items in the knowledge table
 */
async function getKnowledgeCount() {
  try {
    const { count, error } = await supabase
      .from("knowledge")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error getting knowledge count:", error);
      return 0;
    }

    console.log(`Total knowledge items in database: ${count}`);
    return count || 0;
  } catch (error) {
    console.error("Error getting knowledge count:", error);
    return 0;
  }
}

/**
 * Fetches a single batch of knowledge data with pagination
 */
export async function prefetchKnowledgeData(limit?: number, offset?: number) {
  try {
    // Build query based on pagination parameters
    let query = supabase
      .from("knowledge")
      .select("*")
      .order("date", { ascending: false });

    // Apply pagination if specified
    if (typeof limit === "number" && typeof offset === "number") {
      console.log(`Prefetch: offset=${offset}, limit=${limit}`);
      query = query.range(offset, offset + limit - 1);
    } else {
      console.log("Prefetch: all data");
    }

    // Execute the query
    const { data: knowledgeData, error } = await query;

    if (error) {
      console.error("Knowledge fetch error:", error);
      return [];
    }

    if (!knowledgeData || knowledgeData.length === 0) {
      return [];
    }

    console.log(
      `Prefetched ${knowledgeData.length} items${
        limit ? ` (offset ${offset})` : ""
      }`
    );

    // Count unique channels in prefetched data
    const channels = new Set();
    knowledgeData.forEach((item) => {
      if (item["channel name"]) {
        channels.add(item["channel name"]);
      }
    });
    console.log(`Found ${channels.size} unique channels`);

    // No longer using batchId, keeping note for future reference
    // const batchId = typeof offset === "number" ? `batch-${offset}` : "all";

    const transformedData: KnowledgeItem[] = knowledgeData.map(
      (item, index) => ({
        // Generate a stable unique ID if missing - using consistent properties to ensure stability
        id:
          item.id ||
          `${item.video_title?.slice(0, 20)?.replace(/\s+/g, "-")}-${item[
            "channel name"
          ]?.replace(/\s+/g, "-")}-${index}-${offset || 0}`,
        date: item.date,
        transcript: item.transcript,
        corrected_transcript: item.corrected_transcript,
        video_title: item.video_title,
        "channel name": item["channel name"],
        link: item.link || "",
        answer: item.answer || "",
        summary: item.summary || "",
        llm_answer: item.llm_answer || { projects: [] }, // Ensure projects array exists
        video_type: item.video_type || "video", // Default to "video" if not specified
        usage: item.usage || 0, // Add usage field with default value of 0
        _batchIndex: Math.floor(offset ? offset / 200 : 0), // Add batch tracking
      })
    );

    return transformedData;
  } catch (error) {
    console.error("Prefetch Error:", error);
    return []; // Return empty array instead of undefined
  }
}

/**
 * Initializes server-side batch fetching and returns the first batch.
 * Subsequent batches are fetched in the background and stored in cache.
 */
export async function initServerBatchFetching() {
  // Clear old cache if it exists
  const now = Date.now();
  if (dataCache && now - dataCache.timestamp > CACHE_TTL) {
    console.log("Clearing stale cache");
    dataCache = null;
  }

  // Create new cache if it doesn't exist
  if (!dataCache) {
    dataCache = {
      timestamp: now,
      batches: new Map(),
      isFetching: false,
      totalFetched: 0,
    };

    // Get the total count for better progress tracking
    const totalCount = await getKnowledgeCount();
    if (totalCount > 0) {
      dataCache.totalFetched = totalCount;
    }
  }

  // Return first batch if already cached
  if (dataCache.batches.has(0) && dataCache.batches.get(0)?.length) {
    console.log("Using cached first batch");
    return {
      firstBatch: dataCache.batches.get(0) || [],
      totalFetched: dataCache.totalFetched,
    };
  }

  // Fetch first batch
  console.log("Fetching first batch");
  const firstBatch = await prefetchKnowledgeData(BATCH_SIZE, 0);

  // Store in cache
  dataCache.batches.set(0, firstBatch);
  dataCache.totalFetched = firstBatch.length;

  // Start background fetching if not already running
  if (!dataCache.isFetching && firstBatch.length === BATCH_SIZE) {
    dataCache.isFetching = true;
    console.log("Starting background fetching");

    // Don't await this - let it run in the background
    fetchRemainingBatchesInBackground(1);
  }

  return {
    firstBatch,
    totalFetched: dataCache.totalFetched,
  };
}

/**
 * Fetches the next batch of data based on the batchIndex
 */
export async function getNextBatch(batchIndex: number) {
  if (!dataCache) {
    console.log("Cache not initialized, returning empty batch");
    return { batch: [], totalFetched: 0 };
  }

  // Return from cache if available
  if (dataCache.batches.has(batchIndex)) {
    console.log(`Cached batch ${batchIndex}`);
    return {
      batch: dataCache.batches.get(batchIndex) || [],
      totalFetched: dataCache.totalFetched,
    };
  }

  // Calculate proper offset for this batch
  const BATCH_SIZE = 200;
  const offset = batchIndex * BATCH_SIZE;

  // Fetch if not in cache
  console.log(`Fetching batch ${batchIndex} (offset=${offset})`);
  const batch = await prefetchKnowledgeData(BATCH_SIZE, offset);

  // Update cache
  dataCache.batches.set(batchIndex, batch);
  dataCache.totalFetched = Math.max(
    dataCache.totalFetched,
    offset + batch.length
  );

  return { batch, totalFetched: dataCache.totalFetched };
}

/**
 * Background worker to fetch all remaining batches
 * This doesn't block the main thread or response
 */
async function fetchRemainingBatchesInBackground(startBatchIndex: number) {
  try {
    if (!dataCache) return;

    let currentBatchIndex = startBatchIndex;
    let reachedEnd = false;

    while (!reachedEnd) {
      // Skip if we already have this batch
      if (dataCache.batches.has(currentBatchIndex)) {
        currentBatchIndex++;
        continue;
      }

      const BATCH_SIZE = 200;
      const offset = currentBatchIndex * BATCH_SIZE;
      console.log(`Background batch ${currentBatchIndex} (offset ${offset})`);

      const batch = await prefetchKnowledgeData(BATCH_SIZE, offset);
      dataCache.batches.set(currentBatchIndex, batch);

      // Update total fetched
      dataCache.totalFetched = Math.max(
        dataCache.totalFetched,
        offset + batch.length
      );

      // Check if we've reached the end
      if (batch.length < BATCH_SIZE) {
        reachedEnd = true;
        console.log(`Complete: total ${dataCache.totalFetched} items`);
      }

      // Move to next batch
      currentBatchIndex++;

      // Small delay to avoid overwhelming the database
      if (!reachedEnd) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error("Error in background fetching:", error);
  } finally {
    if (dataCache) {
      dataCache.isFetching = false;
    }
  }
}

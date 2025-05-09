"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeItem } from "@/types/knowledge";

// Define the context type
type KnowledgeContextType = {
  knowledgeData: KnowledgeItem[];
  isLoading: boolean;
  error: Error | null;
  loadingMore: boolean;
  progress: number;
  isComplete: boolean;
  totalItems: number;
};

// Create the context
const KnowledgeContext = createContext<KnowledgeContextType | undefined>(
  undefined
);

// Configuration
const FETCH_DELAY = 500; // milliseconds between batches

// Response from the batch API
interface BatchResponse {
  batch: KnowledgeItem[];
  batchIndex: number;
  totalFetched: number;
  hasMore: boolean;
}

/**
 * This provider uses server-side batching with progressive loading.
 * The server fetches batches in the background and caches them.
 * The client retrieves these batches progressively.
 */
export function ClientKnowledgeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // State for batches and loading
  const [nextBatchIndex, setNextBatchIndex] = useState(1); // Start with batch 1 (after initial)
  const [loadingMore, setLoadingMore] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [estimatedTotal, setEstimatedTotal] = useState(1000); // Initial estimate
  const [emptyBatchCount, setEmptyBatchCount] = useState(0); // Track consecutive empty batches
  const [serverTotalItems, setServerTotalItems] = useState(0); // Total items as reported by server

  // Main data query - this loads the first batch and initializes server-side fetching
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      console.log("Initializing first batch");

      // Initialize the server-side batch fetching and get first batch
      const res = await fetch("/api/knowledge-batch?init=true");
      if (!res.ok) throw new Error("Failed to initialize knowledge data");

      const data: BatchResponse = await res.json();
      console.log(`First batch: ${data.batch.length} items`);

      // Update progress
      const total = Math.max(estimatedTotal, data.totalFetched * 1.2);
      setEstimatedTotal(total);
      setServerTotalItems(data.totalFetched);
      setProgress(Math.floor((data.batch.length / total) * 100));

      // Check if we need more data
      if (!data.hasMore) {
        setIsComplete(true);
        setProgress(100);
      }

      return data.batch;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Function to load the next batch from server
  const loadNextBatch = useCallback(async () => {
    if (loadingMore || isComplete) return;

    try {
      setLoadingMore(true);
      console.log(`Batch ${nextBatchIndex}, current: ${data.length} items`);

      // Fetch the next batch from server cache
      const res = await fetch(`/api/knowledge-batch?batch=${nextBatchIndex}`);
      if (!res.ok) throw new Error("Failed to fetch next batch");

      const response: BatchResponse = await res.json();
      console.log(
        `Received batch ${nextBatchIndex}: ${response.batch.length} items`
      );

      // No more data available
      if (response.batch.length === 0) {
        console.log("No more batches");
        setIsComplete(true);
        setProgress(100);
        return;
      }

      // Update data in React Query cache
      queryClient.setQueryData(
        ["knowledge"],
        (oldData: KnowledgeItem[] = []) => {
          // Extra verification logs
          console.log(
            `Merging: old=${oldData.length}, new=${response.batch.length}`
          );

          // Create a lookup map based on ID and if no ID, use a composite key
          const existingItemsMap = new Map();
          oldData.forEach((item) => {
            const key =
              item.id ||
              `${item.video_title}-${item["channel name"]}-${item.date}`;
            existingItemsMap.set(key, true);
          });

          // Filter out duplicates using our more robust approach
          const uniqueItems = response.batch.filter((item) => {
            const key =
              item.id ||
              `${item.video_title}-${item["channel name"]}-${item.date}`;
            return !existingItemsMap.has(key);
          });

          console.log(
            `Found ${uniqueItems.length}/${response.batch.length} unique items in batch ${response.batchIndex}`
          );

          // If we have no unique items but the batch has items, it means we got duplicates
          // This likely indicates a server-side issue with the offset calculation
          if (uniqueItems.length === 0 && response.batch.length > 0) {
            console.warn(`Duplicate batch ${response.batchIndex}`);

            // Log some sample items for debugging
            console.log("Sample items:", response.batch.slice(0, 2));

            // Increment our empty batch counter and force moving to next batch
            setEmptyBatchCount((count) => count + 1);
            setNextBatchIndex(nextBatchIndex + 1);

            // If we've received 3 consecutive empty batches, assume we're done
            if (emptyBatchCount >= 2) {
              console.log("3 empty batches - assuming all data loaded");
              setIsComplete(true);
              setProgress(100);
            }

            // Skip this batch but continue to the next one
            return oldData;
          } else {
            // Reset the empty batch counter on success
            setEmptyBatchCount(0);
          }

          const mergedData = [...oldData, ...uniqueItems];

          // Update total estimate based on server's report
          const newEstimate = Math.max(
            estimatedTotal,
            response.totalFetched * 1.1
          );

          if (newEstimate !== estimatedTotal) {
            setEstimatedTotal(newEstimate);
          }

          // Update server reported total
          if (response.totalFetched > serverTotalItems) {
            setServerTotalItems(response.totalFetched);
          }

          // Update progress
          const newProgress = Math.min(
            99,
            Math.floor((mergedData.length / newEstimate) * 100)
          );
          setProgress(newProgress);

          console.log(
            `Merged: +${uniqueItems.length} items, total=${mergedData.length}, ${newProgress}%`
          );

          return mergedData;
        }
      );

      // Update next batch index
      setNextBatchIndex(nextBatchIndex + 1);

      // Check if we've reached the end
      if (!response.hasMore) {
        console.log("Reached end of data");
        setIsComplete(true);
        setProgress(100);
      }
    } catch (error) {
      console.error("Error loading batch:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    data.length,
    estimatedTotal,
    isComplete,
    loadingMore,
    nextBatchIndex,
    queryClient,
    emptyBatchCount,
    serverTotalItems,
  ]);

  // Effect to load batches progressively with an upper limit on batches to prevent infinite loops
  useEffect(() => {
    if (data.length > 0 && !isLoading && !loadingMore && !isComplete) {
      // Safety check - if we've tried too many batches, assume we're done
      if (nextBatchIndex > 10) {
        console.log("Max batches reached");
        setIsComplete(true);
        setProgress(100);
        return;
      }

      const timer = setTimeout(loadNextBatch, FETCH_DELAY);
      return () => clearTimeout(timer);
    }
  }, [
    data.length,
    isComplete,
    isLoading,
    loadNextBatch,
    loadingMore,
    nextBatchIndex,
  ]);

  // Effect to log data size for debugging
  useEffect(() => {
    if (data.length > 0) {
      console.log(
        `Items: ${data.length}, progress: ${progress}%, batch: ${nextBatchIndex}`
      );
    }
  }, [data.length, progress, nextBatchIndex]);

  return (
    <KnowledgeContext.Provider
      value={{
        knowledgeData: data,
        isLoading,
        error: error as Error | null,
        loadingMore,
        progress,
        isComplete,
        totalItems: serverTotalItems || data.length,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
}

// Hook to use the context
export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error(
      "useKnowledge must be used within a ClientKnowledgeProvider"
    );
  }
  return context;
}
